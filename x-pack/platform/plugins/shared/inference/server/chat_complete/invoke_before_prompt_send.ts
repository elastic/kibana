/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ChatCompleteOptions } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import { BeforePromptSendOutputSchema } from '../anonymization/trigger_schemas';
import { AnonymizationContext } from '../anonymization/context';
import { deriveSalt } from '../anonymization/derive_salt';
import { InferenceAnonymizationUnavailableError } from '../anonymization/errors';
import type { InvokeHookFn } from '../types';
import type { InferenceAnonymizationOptions } from '../inference_client/anonymization_options';
import type { InferenceConfig } from '../config';

export interface BeforePromptSendArgs {
  anonymizationHookInvoker: InvokeHookFn;
  config: InferenceConfig;
  logger: Logger;
  metadata: ChatCompleteOptions['metadata'];
  system: ChatCompleteOptions['system'];
  messages: ChatCompleteOptions['messages'];
  anonymization?: InferenceAnonymizationOptions;
}

export interface BeforePromptSendResult {
  hookSystem: ChatCompleteOptions['system'];
  hookMessages: ChatCompleteOptions['messages'];
  /** Resolved sessionId — pass to applyAfterCompletionHook to avoid a second uuidv4() call. */
  sessionId: string;
  /** Context produced during anonymization; pass to the afterCompletion hook. */
  anonymizationContext: AnonymizationContext;
}

const resolveSessionId = (metadata: ChatCompleteOptions['metadata']): string =>
  metadata?.anonymization?.sessionId ?? uuidv4();

const resolveSalt = async (
  sessionId: string,
  anonymization?: InferenceAnonymizationOptions
): Promise<string> => {
  const encryptionKey = await anonymization?.replacements?.encryptionKeyPromise;
  return encryptionKey ? deriveSalt(sessionId, encryptionKey) : sessionId;
};

const createAnonymizationContext = async (
  sessionId: string,
  anonymization?: InferenceAnonymizationOptions
): Promise<AnonymizationContext> => {
  const salt = await resolveSalt(sessionId, anonymization);
  return new AnonymizationContext(salt);
};

/** Rough token approximation: 1 token ≈ 4 chars. Used only as a pre-flight guard. */
export const estimatePromptTokens = (
  system: ChatCompleteOptions['system'],
  messages: ChatCompleteOptions['messages']
): number => {
  const systemChars = typeof system === 'string' ? system.length : 0;
  const messagesChars = JSON.stringify(messages).length;
  return Math.ceil((systemChars + messagesChars) / 4);
};

const MAX_TOKEN_KEYS_LOGGED = 20;

const logDebugDone = (
  logger: Logger,
  sessionId: string,
  ctx: AnonymizationContext,
  outcome: string
): void => {
  const tokenKeys = [...ctx.tokenMap.keys()].slice(0, MAX_TOKEN_KEYS_LOGGED);
  logger.debug(
    () =>
      `[hook-anon-debug] beforePromptSend done (${outcome}) sessionId=${sessionId} ` +
      `tokenMapSize=${ctx.tokenMap.size}` +
      (tokenKeys.length > 0 ? ` tokenKeys=${JSON.stringify(tokenKeys)}` : '')
  );
};

/**
 * Invokes the `inference.beforePromptSend` hook.
 * Creates an `AnonymizationContext` (salt + token map) and passes it via `capabilities` —
 * the YAML workflow event never sees the salt or tokenMap.
 *
 * Failure behaviour is controlled by `config.anonymization.failureMode`:
 *   - `'block'`: throws `InferenceAnonymizationUnavailableError`
 *   - `'allow_unsafe'`: logs a warning and returns the original system/messages
 */
export const invokeBeforePromptSend = async ({
  anonymizationHookInvoker,
  config,
  logger,
  metadata,
  system,
  messages,
  anonymization,
}: BeforePromptSendArgs): Promise<BeforePromptSendResult> => {
  const sessionId = resolveSessionId(metadata);

  const estimatedTokens = estimatePromptTokens(system, messages);
  if (estimatedTokens > config.anonymization.maxTokensPerCall) {
    const msg =
      `[hook-anon] Prompt exceeds maxTokensPerCall ` +
      `(estimated ${estimatedTokens} > ${config.anonymization.maxTokensPerCall}).`;
    if (config.anonymization.failureMode === 'block') {
      throw new InferenceAnonymizationUnavailableError(
        `${msg} Blocking request (failureMode: block).`
      );
    }
    logger.warn(`${msg} Passing prompt unredacted (failureMode: allow_unsafe).`);
    const anonymizationContext = await createAnonymizationContext(sessionId, anonymization);
    logDebugDone(logger, sessionId, anonymizationContext, 'max_tokens_allow_unsafe');
    return { sessionId, hookSystem: system, hookMessages: messages, anonymizationContext };
  }

  const anonymizationContext = await createAnonymizationContext(sessionId, anonymization);
  const capabilities = { anonymizationContext };

  logger.debug(`[hook-anon] invoking inference.beforePromptSend sessionId=${sessionId}`);

  const result = await anonymizationHookInvoker(
    'inference.beforePromptSend',
    { sessionId, system, messages },
    capabilities
  );

  if (result.status === 'failed') {
    if (config.anonymization.failureMode === 'block') {
      throw new InferenceAnonymizationUnavailableError(result.error);
    }
    logger.warn(
      `[hook-anon] beforePromptSend hook failed (failureMode: allow_unsafe): ${
        result.error ?? 'unknown error'
      }. Passing raw prompt to LLM.`
    );
    logDebugDone(logger, sessionId, anonymizationContext, 'hook_failed_allow_unsafe');
    return { sessionId, hookSystem: system, hookMessages: messages, anonymizationContext };
  }

  if (result.status === 'pass_through') {
    logDebugDone(logger, sessionId, anonymizationContext, 'pass_through');
    return { sessionId, hookSystem: system, hookMessages: messages, anonymizationContext };
  }

  const parsed = BeforePromptSendOutputSchema.safeParse(result.output);
  if (!parsed.success) {
    const errorMsg = `beforePromptSend hook returned invalid output: ${parsed.error.message}`;
    if (config.anonymization.failureMode === 'block') {
      throw new InferenceAnonymizationUnavailableError(errorMsg);
    }
    logger.warn(`[hook-anon] ${errorMsg}. Passing raw prompt to LLM.`);
    logDebugDone(logger, sessionId, anonymizationContext, 'invalid_hook_output_allow_unsafe');
    return { sessionId, hookSystem: system, hookMessages: messages, anonymizationContext };
  }

  logDebugDone(logger, sessionId, anonymizationContext, 'success');
  return {
    sessionId,
    hookSystem: parsed.data.system ?? system,
    // The schema uses passthrough() so messages preserve all original fields.
    // The cast is correct: the hook returns the same message shape it received.
    hookMessages: parsed.data.messages as ChatCompleteOptions['messages'],
    anonymizationContext,
  };
};
