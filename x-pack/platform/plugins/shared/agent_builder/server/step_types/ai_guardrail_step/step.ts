/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { ChatMessage } from '@kbn/agent-builder-server';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import {
  MAX_ATTACHMENTS,
  MAX_CONVERSATION_HISTORY_MESSAGES,
  MAX_CONVERSATION_HISTORY_TOKENS,
} from '@kbn/workflows-extensions/common';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  AiGuardrailStepCommonDefinition,
  type CustomPromptGuardrailConfig,
} from '../../../common/step_types';
import type { AgentBuilderStartDependencies } from '../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

const GUARDRAIL_BASE_PROMPT = `You are a guardrail evaluator. Your job is to decide whether the user message and context below are acceptable to proceed.

Respond with JSON only. Use this exact shape:
- If acceptable: {"pass": true}
- If not acceptable: {"pass": false, "reason": "brief explanation"}

Do not include any other text or markdown.`;

function parseHistoryFromInput(raw: readonly unknown[] | undefined): ChatMessage[] {
  if (!raw?.length) return [];
  const out: ChatMessage[] = [];
  for (const entry of raw) {
    if (entry === null || entry === undefined || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    const content =
      typeof o.content === 'string' ? o.content : o.content != null ? String(o.content) : '';
    const role: 'user' | 'assistant' = o.role === 'assistant' ? 'assistant' : 'user';
    out.push({ role, content });
  }
  return out;
}

function formatHistoryWithinTokenBudget(messages: ChatMessage[]): string {
  const windowed = messages.slice(-MAX_CONVERSATION_HISTORY_MESSAGES * 2);
  let totalTokens = 0;
  const lines: string[] = [];
  for (let i = windowed.length - 1; i >= 0; i--) {
    const msg = windowed[i];
    const line =
      msg.role === 'assistant' ? `[assistant]: ${msg.content}` : `[user]: ${msg.content}`;
    const lineTokens = estimateTokens(line);
    if (totalTokens + lineTokens > MAX_CONVERSATION_HISTORY_TOKENS && lines.length > 0) {
      break;
    }
    lines.unshift(line);
    totalTokens += lineTokens;
  }
  return lines.join('\n');
}

function formatAttachmentsWithinBudget(
  raw: readonly unknown[] | undefined,
  remainingTokens: number
): string {
  if (!raw?.length || remainingTokens <= 0) return '';
  const parts: string[] = [];
  let budget = remainingTokens;
  for (const item of raw.slice(0, MAX_ATTACHMENTS)) {
    if (item === null || item === undefined || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const name =
      (typeof o.id === 'string' && o.id) || (typeof o.type === 'string' && o.type) || 'attachment';
    const data = o.data;
    if (data === undefined || data === null) {
      parts.push(`\n[Attachment ${name}]: (no content)`);
      continue;
    }
    let str: string;
    try {
      str = typeof data === 'string' ? data : JSON.stringify(data, null, 0);
    } catch {
      parts.push(`\n[Attachment ${name}]: (unable to stringify)`);
      continue;
    }
    const t = estimateTokens(str);
    if (t <= budget) {
      parts.push(`\n[Attachment ${name}]:\n${str}`);
      budget -= t;
    } else {
      parts.push(`\n[Attachment ${name} truncated due to limits]`);
    }
  }
  return parts.join('');
}

export const getAiGuardrailStepDefinition = (
  coreSetup: CoreSetup<AgentBuilderStartDependencies, unknown>
) =>
  createServerStepDefinition({
    ...AiGuardrailStepCommonDefinition,
    handler: async (context) => {
      const {
        message,
        conversation_history: conversationHistory = [],
        attachments = [],
        previous_conversations: previousConversations,
        on_fail: onFail = 'abort',
        abort_message: abortMessage,
        checks,
      } = context.input;

      const parsedHistory = parseHistoryFromInput(conversationHistory);
      const historySlice =
        previousConversations != null ? parsedHistory.slice(-previousConversations) : parsedHistory;

      const [, { inference }] = await coreSetup.getStartServices();
      const request = context.contextManager.getFakeRequest();

      for (const check of checks) {
        if (check.type !== 'custom_prompt') continue;

        const config = check.config as CustomPromptGuardrailConfig;
        const checkMessages =
          config.max_turns != null ? historySlice.slice(-config.max_turns) : historySlice;

        const historyText = formatHistoryWithinTokenBudget(checkMessages);
        const historyTokens = estimateTokens(historyText);
        const attachmentBudget = Math.max(0, MAX_CONVERSATION_HISTORY_TOKENS - historyTokens);
        const attachmentText = formatAttachmentsWithinBudget(attachments, attachmentBudget);

        const conversationBlock =
          historyText || attachmentText
            ? `## Conversation history\n\n${historyText}${attachmentText}\n\n`
            : '';

        const userMessage = `${conversationBlock}## Current message\n\n${message}`;
        const systemPrompt = `${GUARDRAIL_BASE_PROMPT}\n\n### Check instructions ###\n\n${config.system_prompt_details}`;

        const resolvedConnectorId = await resolveConnectorId(
          config.inference_id ?? context.config['connector-id'],
          inference,
          request!
        );

        const chatModel = await inference.getChatModel({
          connectorId: resolvedConnectorId,
          request,
          chatModelOptions: { temperature: 0, maxRetries: 0 },
        });

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
          const modelInput = [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: userMessage },
          ];
          const result = await runnable.invoke(modelInput, { signal: context.abortSignal });
          const parsed = result.parsed as { pass?: boolean; reason?: string };
          const pass = parsed?.pass === true;
          const reason = typeof parsed?.reason === 'string' ? parsed.reason : undefined;

          if (pass) continue;

          if (onFail === 'abort') {
            const failReason = reason ?? 'Guardrail evaluation failed.';
            return {
              output: {
                pass: false,
                reason: failReason,
                abort: true,
                abort_message: abortMessage ?? failReason,
              },
            };
          }

          context.logger.warn('Guardrail violation detected', { reason });
          return {
            output: {
              pass: true,
              reason: 'Violation detected but ignored due to monitor mode',
            },
          };
        } catch (err) {
          context.logger.warn(
            'Guardrail LLM evaluation failed',
            err instanceof Error ? err : new Error(String(err))
          );
          if (onFail === 'monitor') {
            return {
              output: {
                pass: true,
                reason: 'System error ignored due to monitor mode',
              },
            };
          }
          return {
            output: {
              pass: false,
              reason: 'System error: unable to evaluate guardrail due to LLM failure.',
              abort: true,
              abort_message: 'System error: unable to evaluate guardrail due to LLM failure.',
            },
          };
        }
      }

      return { output: { pass: true } };
    },
  });
