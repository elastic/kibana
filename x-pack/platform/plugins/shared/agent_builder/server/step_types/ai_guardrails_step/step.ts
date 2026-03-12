/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { Conversation } from '@kbn/agent-builder-common';
import { getActiveAttachments, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { AiGuardrailsStepCommonDefinition } from '../../../common/step_types';
import type { InternalStartServices } from '../../services/types';
import type { AgentBuilderStartDependencies } from '../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

interface GuardrailLogger {
  warn: (message: string, error?: Error) => void;
}

const GUARDRAIL_SYSTEM_PROMPT = `You are a guardrail evaluator. Your job is to decide whether the user message and context below are acceptable to proceed (e.g. no harmful content, no policy violations, no off-topic or inappropriate requests).

Respond with JSON only. Use this exact shape:
- If acceptable: {"pass": true}
- If not acceptable: {"pass": false, "reason": "brief explanation"}

Do not include any other text or markdown.`;

const MAX_CONTEXT_TOKENS = 100_000;

async function formatConversationHistory(conversation: Conversation): Promise<string> {
  const lines: string[] = [];
  let currentTokenCount = 0;
  const rounds = conversation.rounds ?? [];

  for (let i = rounds.length - 1; i >= 0; i--) {
    const round = rounds[i];
    const userMsg = round.input?.message ?? '';
    const assistantMsg = round.response?.message ?? '';
    const roundText = [
      userMsg ? `[user]: ${userMsg}` : '',
      assistantMsg ? `[assistant]: ${assistantMsg}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    if (!roundText) continue;

    const roundTokens = estimateTokens(roundText);
    if (currentTokenCount + roundTokens > MAX_CONTEXT_TOKENS) break;

    lines.unshift(roundText);
    currentTokenCount += roundTokens;
  }

  let remainingTokens = MAX_CONTEXT_TOKENS - currentTokenCount;
  const activeAttachments = getActiveAttachments(conversation.attachments ?? []);

  for (const attachment of activeAttachments) {
    const version = getLatestVersion(attachment);
    const data = version?.data;
    const name = attachment.description ?? attachment.id ?? attachment.type;

    if (data === undefined || data === null) {
      lines.push(`\n[Attachment ${name}]: (no content)`);
      continue;
    }

    let attachmentStr: string;
    try {
      attachmentStr = typeof data === 'string' ? data : JSON.stringify(data, null, 0);
    } catch {
      lines.push(`\n[Attachment ${name}]: (unable to stringify)`);
      continue;
    }

    const attachmentTokens = estimateTokens(attachmentStr);
    if (attachmentTokens <= remainingTokens) {
      lines.push(`\n[Attachment ${name}]:\n${attachmentStr}`);
      remainingTokens -= attachmentTokens;
    } else {
      lines.push(`\n[Attachment ${name} truncated due to limits]`);
    }
  }

  return lines.join('\n');
}

async function fetchConversationContext(
  conversationId: string,
  getInternalServices: () => InternalStartServices,
  request: KibanaRequest,
  logger: GuardrailLogger
): Promise<string | null> {
  try {
    const { conversations } = getInternalServices();
    const client = await conversations.getScopedClient({ request });
    const conversation = await client.get(conversationId);
    return await formatConversationHistory(conversation);
  } catch (err) {
    logger.warn(
      `Failed to fetch conversation for guardrail context (conversation_id=${conversationId}), proceeding with current message only.`,
      err instanceof Error ? err : undefined
    );
    return null;
  }
}

export const getAiGuardrailsStepDefinition = (
  coreSetup: CoreSetup<AgentBuilderStartDependencies, unknown>,
  getInternalServices: () => InternalStartServices
) =>
  createServerStepDefinition({
    ...AiGuardrailsStepCommonDefinition,
    handler: async (context) => {
      const { message, conversation_id: conversationId, custom_rules: customRules } = context.input;

      let conversationBlock = '';
      if (conversationId?.trim()) {
        const request = context.contextManager.getFakeRequest();
        if (request) {
          const history = await fetchConversationContext(
            conversationId.trim(),
            getInternalServices,
            request,
            context.logger
          );
          if (history) {
            conversationBlock = `## Conversation history\n\n${history}\n\n`;
          }
        } else {
          context.logger.warn(
            'No request available for conversation fetch; proceeding with current message only.'
          );
        }
      }

      const systemPrompt =
        GUARDRAIL_SYSTEM_PROMPT +
        (customRules?.trim() ? `\n\n### CUSTOM USER RULES ###\n\n${customRules.trim()}` : '');

      const userMessage = `${conversationBlock}## Current message\n\n${message}`;

      const [, { inference }] = await coreSetup.getStartServices();
      const resolvedConnectorId = await resolveConnectorId(
        context.config['connector-id'],
        inference,
        context.contextManager.getFakeRequest()
      );

      const chatModel = await inference.getChatModel({
        connectorId: resolvedConnectorId,
        request: context.contextManager.getFakeRequest(),
        chatModelOptions: { temperature: 0, maxRetries: 0 },
      });

      const modelInput = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userMessage },
      ];

      const runnable = chatModel.withStructuredOutput(
        {
          type: 'object',
          properties: {
            pass: { type: 'boolean' },
            reason: { type: 'string' },
          },
          required: ['pass'],
        },
        { name: 'guardrail_eval', includeRaw: true, method: 'jsonMode' as const }
      );

      try {
        const result = await runnable.invoke(modelInput, { signal: context.abortSignal });
        const parsed = result.parsed as { pass?: boolean; reason?: string };
        const pass = parsed?.pass === true;
        const reason = typeof parsed?.reason === 'string' ? parsed.reason : undefined;

        if (pass) {
          return { output: { pass: true } };
        }

        return {
          output: {
            pass: false,
            reason: reason ?? 'Guardrail evaluation failed.',
            abort: true,
            abort_message: reason ?? 'Guardrail evaluation failed.',
          },
        };
      } catch (err) {
        context.logger.warn(
          'Guardrail LLM evaluation failed',
          err instanceof Error ? err : new Error(String(err))
        );
        return {
          output: {
            pass: false,
            reason: 'System error: unable to evaluate guardrails due to LLM failure.',
            abort: true,
            abort_message: 'System error: unable to evaluate guardrails due to LLM failure.',
          },
        };
      }
    },
  });
