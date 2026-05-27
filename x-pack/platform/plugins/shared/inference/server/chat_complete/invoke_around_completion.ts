/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ChatCompleteOptions } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import { deriveSalt } from '../anonymization/derive_salt';
import { InferenceAnonymizationUnavailableError } from '../anonymization/errors';
import { buildAnonymizationInstruction } from './invoke_before_completion';
import type { InvokeHookFn } from '../types';
import type { InferenceAnonymizationOptions } from '../inference_client/anonymization_options';
import type { InferenceConfig } from '../config';

interface TokenEntry {
  original: string;
  entityClass: string;
}

export interface AroundCompletionArgs {
  anonymizationHookInvoker: InvokeHookFn;
  config: InferenceConfig;
  logger: Logger;
  metadata: ChatCompleteOptions['metadata'];
  system: ChatCompleteOptions['system'];
  messages: ChatCompleteOptions['messages'];
  anonymization?: InferenceAnonymizationOptions;
  /** Caller-supplied sessionId — avoids a second uuidv4() when composing with invokeBeforeCompletion. */
  sessionId?: string;
  /**
   * Optional function that performs the actual LLM call.
   * When passed as a capability, YAML workflows containing call_site.proceed will
   * receive it and can suspend/resume execution around the LLM call.
   */
  proceedFn?: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/**
 * Streaming path — workflow emitted anonymized system/messages via workflow.output.
 * The caller streams the LLM call directly and uses restoreTokensOperator.
 */
export interface StreamingAroundCompletionResult {
  kind: 'streaming';
  anonymizedSystem: ChatCompleteOptions['system'];
  anonymizedMessages: ChatCompleteOptions['messages'];
  sessionId: string;
  tokenMap: Record<string, TokenEntry>;
}

/**
 * Buffered path — workflow contained call_site.proceed and performed the LLM call itself.
 * The caller synthesises an event stream from the workflow's output.
 */
export interface BufferedAroundCompletionResult {
  kind: 'buffered';
  /** Final response text, already processed by any post-proceed workflow steps. */
  finalResponse: string;
  sessionId: string;
  tokenMap: Record<string, TokenEntry>;
}

export type AroundCompletionResult =
  | StreamingAroundCompletionResult
  | BufferedAroundCompletionResult;

/**
 * Invokes the `inference.aroundCompletion` hook and returns anonymized inputs.
 *
 * The workflow contains `ai.pii` steps that detect PII and emit anonymized
 * system/messages plus tokenMap via `workflow.output`. After the hook runs,
 * this function reads those values from `result.output` and returns them to
 * the caller, which either streams the LLM call directly (streaming path) or
 * uses the pre-assembled response when the workflow contained `call_site.proceed`
 * (buffered path).
 *
 * Failure behaviour is controlled by `config.anonymization.failureMode`:
 *   - `'block'`: throws `InferenceAnonymizationUnavailableError`
 *   - `'allow_unsafe'`: logs a warning and returns original inputs
 */
export const invokeAroundCompletion = async ({
  anonymizationHookInvoker,
  config,
  logger,
  metadata,
  system,
  messages,
  anonymization,
  sessionId: providedSessionId,
  proceedFn,
}: AroundCompletionArgs): Promise<AroundCompletionResult> => {
  const sessionId = providedSessionId ?? metadata?.anonymization?.sessionId ?? uuidv4();

  const encryptionKey = await anonymization?.replacements?.encryptionKeyPromise;
  const salt = encryptionKey ? deriveSalt(sessionId, encryptionKey) : sessionId;

  const capabilities: Record<string, unknown> = {};
  if (proceedFn) {
    capabilities.proceedFn = proceedFn;
  }

  logger.debug(`[hook-anon] invoking inference.aroundCompletion sessionId=${sessionId}`);

  const result = await anonymizationHookInvoker(
    'inference.aroundCompletion',
    { sessionId, salt, system, messages },
    capabilities
  );

  const emptyTokenMap: Record<string, TokenEntry> = {};

  if (result.status === 'failed') {
    if (config.anonymization.failureMode === 'block') {
      throw new InferenceAnonymizationUnavailableError(result.error);
    }
    logger.warn(
      `[hook-anon] aroundCompletion hook failed (failureMode: allow_unsafe): ${
        result.error ?? 'unknown error'
      }. Using original inputs.`
    );
    return {
      kind: 'streaming',
      anonymizedSystem: system,
      anonymizedMessages: messages,
      sessionId,
      tokenMap: emptyTokenMap,
    };
  }

  if (result.status === 'pass_through') {
    logger.debug(`[hook-anon] aroundCompletion pass_through — using original inputs`);
    return {
      kind: 'streaming',
      anonymizedSystem: system,
      anonymizedMessages: messages,
      sessionId,
      tokenMap: emptyTokenMap,
    };
  }

  // Buffered path: workflow ran call_site.proceed and returned a result string.
  if (typeof result.output?.result === 'string') {
    const tokenMap = (result.output?.tokenMap ?? {}) as Record<string, TokenEntry>;
    logger.debug(
      () =>
        `[hook-anon-debug] aroundCompletion buffered path done sessionId=${sessionId} ` +
        `tokenMapSize=${Object.keys(tokenMap).length}`
    );
    return {
      kind: 'buffered',
      finalResponse: result.output.result as string,
      sessionId,
      tokenMap,
    };
  }

  // Streaming path: workflow emitted anonymized system/messages/tokenMap via workflow.output.
  const rawSystem = result.output?.system;
  const rawMessages = result.output?.messages;
  const tokenMap = (result.output?.tokenMap ?? {}) as Record<string, TokenEntry>;

  if (rawSystem !== undefined && typeof rawSystem !== 'string') {
    logger.warn(
      `[hook-anon] aroundCompletion: system field has unexpected type ${typeof rawSystem}, using original`
    );
  }
  if (rawMessages !== undefined && !Array.isArray(rawMessages)) {
    logger.warn(`[hook-anon] aroundCompletion: messages field has unexpected type, using original`);
  }

  const anonymizedSystem = (typeof rawSystem === 'string' ? rawSystem : undefined) ?? system;
  const anonymizedMessages =
    (Array.isArray(rawMessages) ? (rawMessages as ChatCompleteOptions['messages']) : undefined) ??
    messages;

  const instruction =
    Object.keys(tokenMap).length > 0 ? buildAnonymizationInstruction(tokenMap) : '';

  const finalSystem = instruction
    ? anonymizedSystem
      ? `${anonymizedSystem}\n\n${instruction}`
      : instruction
    : anonymizedSystem;

  logger.debug(
    () =>
      `[hook-anon-debug] aroundCompletion done sessionId=${sessionId} ` +
      `tokenMapSize=${Object.keys(tokenMap).length}`
  );

  return {
    kind: 'streaming',
    anonymizedSystem: finalSystem,
    anonymizedMessages,
    sessionId,
    tokenMap,
  };
};
