/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ConversationRound, MetadataFieldValue, RoundInput } from '@kbn/agent-builder-common';
import { ChatEventType, ConversationRoundStatus } from '@kbn/agent-builder-common';
import { createMessageEvent, createTextChunkEvent } from '@kbn/agent-builder-genai-utils/langchain';
import type { AgentHandlerContext } from '@kbn/agent-builder-server';
import type { ConversationClient } from '../../../conversation';
import { DEDUCTIVE_METADATA_KEY, resolveDeductiveConfig } from './config';
import {
  sendDeductiveMessageAndReadSse,
  createDeductiveSession,
  refreshDeductiveToken,
  type DeductiveRunResult,
} from './deductive_client';
import { DeductiveError } from './errors';
import { DeductiveSessionUnavailableError } from './session_unavailable_error';
import type { RunAgentParams, RunAgentResponse } from '../run_agent';

/**
 * Executes a round of conversation against the external Deductive chat API.
 *
 * Session continuity is persisted in `conversation.metadata.deductive_session_id`
 * so multi-turn conversations reuse the same Deductive thread. The response is
 * streamed into the existing Agent Builder event pipeline (messageChunk /
 * messageComplete) and finalized via a standard roundComplete event, which keeps
 * persistence and the chat UI behaving exactly like a native round.
 */
export const runDeductiveAgent = async (
  params: RunAgentParams,
  context: AgentHandlerContext
): Promise<RunAgentResponse> => {
  const { logger } = context;
  // Advanced Settings (context.deductive) take precedence; env vars remain a dev fallback.
  const config = resolveDeductiveConfig(context.deductive);

  if (!config.token) {
    throw new DeductiveError(
      'Deductive execution requires a bearer token. Set DEDUCTIVE_API_KEY (and optionally DEDUCTIVE_REFRESH_TOKEN).'
    );
  }

  const conversation = params.conversation;
  const conversationId = conversation?.id;
  const metadata = conversation?.metadata ?? {};
  const existingSessionId =
    typeof metadata[DEDUCTIVE_METADATA_KEY] === 'string'
      ? (metadata[DEDUCTIVE_METADATA_KEY] as string)
      : undefined;

  const startTime = new Date();
  const message = await buildAttributedMessage(params.nextInput, context);
  const messageId = params.roundId ?? uuidv4();
  const roundInput = buildRoundInput(params);
  const outputSchema =
    params.structuredOutput && params.outputSchema
      ? JSON.stringify(params.outputSchema)
      : undefined;

  // The persistence pipeline keys off `roundStarted` (matched to round_complete by
  // round_id) before persisting the conversation, so it must always be emitted first.
  context.events.emit({
    type: ChatEventType.roundStarted,
    data: {
      round_id: messageId,
      input: roundInput,
      started_at: startTime.toISOString(),
      ...(params.author ? { author: params.author } : {}),
      ...(params.origin ? { origin: { type: params.origin.type } } : {}),
    },
  });

  // One recovery attempt: if the persisted session is gone (404/403/410), mint a
  // fresh session and replay the same message (mirrors the dx CLI behavior).
  let sessionId = existingSessionId;
  let attempt = 0;
  let result: DeductiveRunResult | undefined;

  while (result === undefined && attempt < 2) {
    attempt += 1;
    try {
      if (sessionId === undefined) {
        const session = await createDeductiveSession({
          endpoint: config.endpoint,
          token: config.token,
          teamId: config.teamId,
        });
        sessionId = session.sessionId;
      }

      result = await sendDeductiveMessageAndReadSse({
        endpoint: config.endpoint,
        token: config.token,
        teamId: config.teamId,
        sessionId,
        message,
        outputSchema,
        abortSignal: params.abortSignal,
        callbacks: {
          onAnswerChunk: (content) => {
            context.events.emit(createTextChunkEvent(content, { messageId }));
          },
          onProgress: (progress) => {
            logger.debug(`deductive progress: ${progress}`);
          },
        },
      });
    } catch (error) {
      if (error instanceof DeductiveSessionUnavailableError && attempt < 2) {
        logger.warn(
          `Deductive session ${sessionId} unavailable (${error.statusCode}); creating a fresh session`
        );
        sessionId = undefined;
        continue;
      }
      if (error instanceof DeductiveError && error.statusCode === 401 && config.refreshToken) {
        const refreshed = await refreshDeductiveToken({
          endpoint: config.endpoint,
          refreshToken: config.refreshToken,
        });
        config.token = refreshed.token;
        config.refreshToken = refreshed.refreshToken;
        attempt -= 1; // allow the retry budget to be used for the auth retry
        continue;
      }
      throw error;
    }
  }

  if (result === undefined) {
    throw new DeductiveError('deductive execution did not produce a result');
  }
  if (sessionId === undefined) {
    throw new DeductiveError('deductive execution did not establish a session');
  }

  // Persist the session id so turn 2+ reuses the same Deductive thread.
  await persistDeductiveSessionId({
    context,
    conversationId,
    metadata,
    sessionId,
  });

  const endTime = new Date();
  const round: ConversationRound = {
    id: messageId,
    status: ConversationRoundStatus.completed,
    input: roundInput,
    origin: params.origin ? { type: params.origin.type } : undefined,
    author: params.author,
    steps: [],
    response: {
      message: result.answer,
      ...(params.structuredOutput
        ? { structured_output: tryParseStructuredOutput(result.answer) }
        : {}),
    },
    started_at: startTime.toISOString(),
    time_to_first_token: result.timeToFirstTokenMs,
    time_to_last_token: Math.max(1, endTime.getTime() - startTime.getTime()),
    model_usage: {
      connector_id: 'deductive',
      llm_calls: 1,
      input_tokens: 0,
      output_tokens: 0,
      model: 'deductive',
    },
    configuration_overrides: params.configurationOverrides,
  };

  // Finalize the streamed message so the UI can reconcile the round.
  context.events.emit(createMessageEvent(round.response.message, { messageId }));
  context.events.emit({
    type: ChatEventType.roundComplete,
    data: { round },
  });

  return { round };
};

const buildAttributedMessage = async (
  nextInput: RunAgentParams['nextInput'],
  context: AgentHandlerContext
): Promise<string> => {
  let username: string | undefined;
  try {
    const auth = await context.esClient.asCurrentUser.security.authenticate();
    username = auth.username;
  } catch {
    // identity is best-effort attribution only
  }

  const message = nextInput.message ?? '';
  return username ? `[from ${username}] ${message}` : message;
};

const buildRoundInput = ({ nextInput }: RunAgentParams): RoundInput => ({
  message: nextInput.message ?? '',
  ...(nextInput.attachment_refs ? { attachment_refs: nextInput.attachment_refs } : {}),
});

const tryParseStructuredOutput = (answer: string): object | undefined => {
  try {
    return JSON.parse(answer);
  } catch {
    return undefined;
  }
};

const persistDeductiveSessionId = async ({
  context,
  conversationId,
  metadata,
  sessionId,
}: {
  context: AgentHandlerContext;
  conversationId: string | undefined;
  metadata: Record<string, MetadataFieldValue>;
  sessionId: string;
}): Promise<void> => {
  if (!conversationId) {
    return;
  }

  const updatedMetadata: Record<string, MetadataFieldValue> = {
    ...metadata,
    [DEDUCTIVE_METADATA_KEY]: sessionId,
  };

  try {
    // The handler context narrows conversationClient to the template-gated metadata
    // contract; the runtime client (conversation service scoped client) exposes the
    // full plugin API, whose `update` writes arbitrary metadata without a template.
    const conversationClient = context.conversationClient as ConversationClient;
    await conversationClient.update(
      { id: conversationId, metadata: updatedMetadata },
      { access: 'owner', retryOnConflict: true }
    );
  } catch (error) {
    context.logger.warn(
      `Failed to persist deductive_session_id for conversation ${conversationId}: ${error.message}`
    );
  }
};
