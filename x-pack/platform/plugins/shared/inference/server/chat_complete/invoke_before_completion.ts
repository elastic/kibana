/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ChatCompleteOptions } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import { BeforeCompletionOutputSchema } from '../anonymization/trigger_schemas';
import { deriveSalt } from '../anonymization/derive_salt';
import { InferenceAnonymizationUnavailableError } from '../anonymization/errors';
import type { InvokeHookFn } from '../types';
import type { InferenceAnonymizationOptions } from '../inference_client/anonymization_options';
import type { InferenceConfig } from '../config';

export interface BeforeCompletionArgs {
  anonymizationHookInvoker: InvokeHookFn;
  config: InferenceConfig;
  logger: Logger;
  metadata: ChatCompleteOptions['metadata'];
  system: ChatCompleteOptions['system'];
  messages: ChatCompleteOptions['messages'];
  anonymization?: InferenceAnonymizationOptions;
}

export interface BeforeCompletionResult {
  hookSystem: ChatCompleteOptions['system'];
  hookMessages: ChatCompleteOptions['messages'];
  /** Resolved sessionId — pass to applyAfterCompletionHook to avoid a second uuidv4() call. */
  sessionId: string;
  /** Token map produced by the beforeCompletion workflow run; pass to applyAfterCompletionHook. */
  tokenMap: Record<string, { original: string; entityClass: string }>;
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

/** Rough token approximation: 1 token ≈ 4 chars. Used only as a pre-flight guard. */
export const estimatePromptTokens = (
  system: ChatCompleteOptions['system'],
  messages: ChatCompleteOptions['messages']
): number => {
  const systemChars = typeof system === 'string' ? system.length : 0;
  const messagesChars = JSON.stringify(messages).length;
  return Math.ceil((systemChars + messagesChars) / 4);
};

/**
 * Builds a short system-prompt instruction that tells the LLM about the anonymization
 * tokens it will encounter. Without this, the LLM may hallucinate what tokens represent,
 * attempt to "fill them in", or refuse to use them in tool calls.
 *
 * The instruction is injected only when tokens were actually produced in this call, and
 * lists only the entity types present — keeping it minimal and accurate.
 */
export const buildAnonymizationInstruction = (
  tokenMap: Record<string, { original: string; entityClass: string }>
): string => {
  const entries = Object.values(tokenMap);
  if (entries.length === 0) return '';

  const entityTypes = [...new Set(entries.map((e) => e.entityClass))];

  return [
    '[Anonymization context]',
    'Some values in this prompt have been replaced with privacy tokens of the form',
    'ENTITY_TYPE_<32 hex chars> (e.g. EMAIL_a3f2c1d809e64b275fae2a8c9b1d04e7).',
    `Entity types present: ${entityTypes.join(', ')}.`,
    'Rules:',
    '- Preserve tokens exactly as written; do not attempt to infer or reveal the original value.',
    '- If instructed to use a token in an action, treat the token as the identifier — do not refuse because it looks like a placeholder.',
    '- Do not mention that anonymization is in effect unless the user asks directly.',
  ].join('\n');
};

const MAX_TOKEN_KEYS_LOGGED = 20;

const logDebugDone = (
  logger: Logger,
  sessionId: string,
  tokenMap: Record<string, { original: string; entityClass: string }>,
  outcome: string
): void => {
  const tokenKeys = Object.keys(tokenMap).slice(0, MAX_TOKEN_KEYS_LOGGED);
  logger.debug(
    () =>
      `[hook-anon-debug] beforeCompletion done (${outcome}) sessionId=${sessionId} ` +
      `tokenMapSize=${Object.keys(tokenMap).length}` +
      (tokenKeys.length > 0 ? ` tokenKeys=${JSON.stringify(tokenKeys)}` : '')
  );
};

/**
 * Invokes the `inference.beforeCompletion` hook.
 * Derives a salt from the sessionId and passes it in the event payload so
 * ai.pii steps can generate deterministic tokens without a capability side-channel.
 * The resulting tokenMap is read from the hook's workflow output.
 *
 * Failure behaviour is controlled by `config.anonymization.failureMode`:
 *   - `'block'`: throws `InferenceAnonymizationUnavailableError`
 *   - `'allow_unsafe'`: logs a warning and returns the original system/messages
 */
export const invokeBeforeCompletion = async ({
  anonymizationHookInvoker,
  config,
  logger,
  metadata,
  system,
  messages,
  anonymization,
}: BeforeCompletionArgs): Promise<BeforeCompletionResult> => {
  const sessionId = resolveSessionId(metadata);
  const salt = await resolveSalt(sessionId, anonymization);

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
    logDebugDone(logger, sessionId, {}, 'max_tokens_allow_unsafe');
    return { sessionId, hookSystem: system, hookMessages: messages, tokenMap: {} };
  }

  logger.debug(`[hook-anon] invoking inference.beforeCompletion sessionId=${sessionId}`);

  const result = await anonymizationHookInvoker(
    'inference.beforeCompletion',
    { sessionId, salt, system, messages },
    {}
  );

  if (result.status === 'failed') {
    if (config.anonymization.failureMode === 'block') {
      throw new InferenceAnonymizationUnavailableError(result.error);
    }
    logger.warn(
      `[hook-anon] beforeCompletion hook failed (failureMode: allow_unsafe): ${
        result.error ?? 'unknown error'
      }. Passing raw prompt to LLM.`
    );
    logDebugDone(logger, sessionId, {}, 'hook_failed_allow_unsafe');
    return { sessionId, hookSystem: system, hookMessages: messages, tokenMap: {} };
  }

  if (result.status === 'pass_through') {
    logDebugDone(logger, sessionId, {}, 'pass_through');
    return { sessionId, hookSystem: system, hookMessages: messages, tokenMap: {} };
  }

  const parsed = BeforeCompletionOutputSchema.safeParse(result.output);
  if (!parsed.success) {
    const errorMsg = `beforeCompletion hook returned invalid output: ${parsed.error.message}`;
    if (config.anonymization.failureMode === 'block') {
      throw new InferenceAnonymizationUnavailableError(errorMsg);
    }
    logger.warn(`[hook-anon] ${errorMsg}. Passing raw prompt to LLM.`);
    logDebugDone(logger, sessionId, {}, 'invalid_hook_output_allow_unsafe');
    return { sessionId, hookSystem: system, hookMessages: messages, tokenMap: {} };
  }

  const tokenMap = parsed.data.tokenMap ?? {};
  logDebugDone(logger, sessionId, tokenMap, 'success');

  const anonymizedSystem = parsed.data.system ?? system;
  const instruction =
    Object.keys(tokenMap).length > 0
      ? parsed.data.systemPromptInstruction ?? buildAnonymizationInstruction(tokenMap)
      : '';
  if (instruction) {
    logger.debug(
      () =>
        `[hook-anon-debug] injecting anonymization instruction sessionId=${sessionId} ` +
        `source=${parsed.data.systemPromptInstruction ? 'workflow-override' : 'auto-generated'} ` +
        `instructionLen=${instruction.length}`
    );
  }

  const hookSystem = instruction
    ? anonymizedSystem
      ? `${anonymizedSystem}\n\n${instruction}`
      : instruction
    : anonymizedSystem;

  return {
    sessionId,
    hookSystem,
    hookMessages: parsed.data.messages as ChatCompleteOptions['messages'],
    tokenMap,
  };
};
