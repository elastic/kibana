/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionEvent } from '@kbn/inference-common';
import {
  ChatCompletionEventType,
  type ChatCompletionChunkEvent,
  type ChatCompletionMessageEvent,
} from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import { EMPTY, from, mergeMap, of } from 'rxjs';
import type { OperatorFunction } from 'rxjs';
import { AfterCompletionOutputSchema } from '../anonymization/trigger_schemas';
import type { AnonymizationContext } from '../anonymization/context';
import { InferenceAnonymizationUnavailableError } from '../anonymization/errors';
import type { InvokeHookFn } from '../types';
import type { InferenceConfig } from '../config';

export interface AfterCompletionHookArgs {
  anonymizationHookInvoker: InvokeHookFn;
  config: InferenceConfig;
  logger: Logger;
  /** Must be the exact sessionId resolved by invokeBeforeCompletion. */
  sessionId: string;
  /** Context from the beforeCompletion hook — carries the token map for restoration. */
  anonymizationContext: AnonymizationContext;
}

/**
 * Matches tokens produced by the anonymization pipeline: `<ENTITY_CLASS>_<32 hex chars>`.
 * Must stay in sync with the token format in inference_workflows/server/anonymization/generate_token.ts.
 */
const TOKEN_RESTORE_REGEX = /\b([A-Z][A-Z0-9_]*)_([0-9a-f]{32})\b/g;

/**
 * Matches the start of a potential token at the END of a buffered string.
 * Used by the sliding hold-buffer to avoid emitting a partial token that spans a chunk boundary.
 * Matches: "HOST", "HOST_NAME", "HOST_NAME_", "HOST_NAME_d985"
 * Does NOT match a complete token followed by more text.
 */
const PARTIAL_TOKEN_END_RE = /[A-Z][A-Z0-9_]*(?:_[0-9a-f]*)?$/;

export const restoreInString = (
  text: string,
  tokenMap: AnonymizationContext['tokenMap']
): string => {
  const re = new RegExp(TOKEN_RESTORE_REGEX.source, TOKEN_RESTORE_REGEX.flags);
  return text.replace(re, (fullMatch) => tokenMap.get(fullMatch)?.original ?? fullMatch);
};

/**
 * Recursively restores anonymization tokens in an arbitrary value.
 * Strings are restored via `restoreInString`; arrays and objects are walked recursively.
 * All other values pass through unchanged.
 *
 * The return type is `unknown` because the function handles arbitrary nesting.
 * Callers restoring a known-typed value (e.g. tool arguments) should assert the type at the call site.
 */
export const restoreInValue = (
  value: unknown,
  tokenMap: AnonymizationContext['tokenMap']
): unknown => {
  if (typeof value === 'string') return restoreInString(value, tokenMap);
  if (Array.isArray(value)) return value.map((item) => restoreInValue(item, tokenMap));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        restoreInValue(v, tokenMap),
      ])
    );
  }
  return value;
};

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '[non-serializable]';
  }
};

const collectTokenPatterns = (text: string): string[] =>
  text.match(new RegExp(TOKEN_RESTORE_REGEX.source, 'g')) ?? [];

const logDebugToolCallRestore = ({
  logger,
  sessionId,
  toolName,
  toolCallId,
  argsBefore,
  argsAfter,
  tokenMap,
}: {
  logger: Logger;
  sessionId: string;
  toolName: string;
  toolCallId: string;
  argsBefore: unknown;
  argsAfter: unknown;
  tokenMap: AnonymizationContext['tokenMap'];
}): void => {
  const beforeStr = safeStringify(argsBefore);
  const afterStr = safeStringify(argsAfter);
  const patternsBefore = collectTokenPatterns(beforeStr);
  const patternsAfter = collectTokenPatterns(afterStr);
  const patternsNotInMap = patternsBefore.filter((t) => !tokenMap.has(t));

  if (patternsBefore.length === 0 && beforeStr === afterStr) return;

  logger.debug(
    () =>
      `[hook-anon-debug] toolArgsRestore sessionId=${sessionId} tool=${toolName} toolCallId=${toolCallId} ` +
      `tokenPatternsBefore=${patternsBefore.length} tokenPatternsAfter=${patternsAfter.length} ` +
      `argsChanged=${beforeStr !== afterStr}` +
      (patternsNotInMap.length > 0 ? ` unmappedTokens=${JSON.stringify(patternsNotInMap)}` : '')
  );
};

/**
 * Resolves the deanonymized response text from the afterCompletion hook result.
 * Returns the original `responseText` on failure, applying `failureMode` policy.
 */
const resolveRestoredText = async ({
  anonymizationHookInvoker,
  config,
  logger,
  sessionId,
  responseText,
  capabilities,
}: {
  anonymizationHookInvoker: InvokeHookFn;
  config: InferenceConfig;
  logger: Logger;
  sessionId: string;
  responseText: string;
  capabilities: Record<string, unknown>;
}): Promise<string> => {
  const result = await anonymizationHookInvoker(
    'inference.afterCompletion',
    { sessionId, response: responseText },
    capabilities
  );

  if (result.status === 'failed') {
    if (config.anonymization.failureMode === 'block') {
      throw new InferenceAnonymizationUnavailableError(result.error);
    }
    logger.warn(
      `[hook-anon] afterCompletion hook failed (failureMode: allow_unsafe): ${
        result.error ?? 'unknown error'
      }. Using original response.`
    );
    return responseText;
  }

  if (result.status === 'pass_through') {
    return responseText;
  }

  const parsed = AfterCompletionOutputSchema.safeParse(result.output);
  if (!parsed.success) {
    const errorMsg = `afterCompletion hook returned invalid output: ${parsed.error.message}`;
    if (config.anonymization.failureMode === 'block') {
      throw new InferenceAnonymizationUnavailableError(errorMsg);
    }
    logger.warn(`[hook-anon] ${errorMsg}. Using original response.`);
    return responseText;
  }

  return parsed.data.response;
};

/**
 * RxJS operator that streams content chunks through a sliding hold-buffer so
 * anonymization tokens spanning a chunk boundary are never emitted raw, then
 * calls the `inference.afterCompletion` hook on the assembled `ChatCompletionMessage`
 * to restore any remaining tokens in the full response text.
 *
 * Algorithm (RFC §4.6):
 * - Per chunk: accumulate content into `holdBuffer`; find the longest safe prefix
 *   (the part that cannot start a partial token) using `PARTIAL_TOKEN_END_RE`;
 *   restore and emit that prefix; keep the rest in the buffer.
 * - Tool-call delta chunks are dropped — tool calls are restored from the fully
 *   assembled `ChatCompletionMessage` at the end.
 * - On `ChatCompletionMessage`: flush the hold buffer + call the hook + restore
 *   tool-call arguments; emit a flush chunk followed by the restored message.
 *
 * On hook failure: `failureMode: 'block'` throws; `'allow_unsafe'` logs and passes through.
 */
export const applyAfterCompletionHook = ({
  anonymizationHookInvoker,
  config,
  logger,
  sessionId,
  anonymizationContext,
}: AfterCompletionHookArgs): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent> => {
  const capabilities = { anonymizationContext };

  return (source$) => {
    let holdBuffer = '';

    return source$.pipe(
      mergeMap((event) => {
        const { tokenMap } = anonymizationContext;

        if (event.type === ChatCompletionEventType.ChatCompletionChunk) {
          const content = event.content ?? '';
          if (!content) return EMPTY;

          holdBuffer += content;

          const m = PARTIAL_TOKEN_END_RE.exec(holdBuffer);
          let safe: string;
          if (m !== null && m.index !== undefined) {
            safe = holdBuffer.slice(0, m.index);
            holdBuffer = holdBuffer.slice(m.index);
          } else {
            safe = holdBuffer;
            holdBuffer = '';
          }

          if (!safe) return EMPTY;

          const restoredChunk: ChatCompletionChunkEvent = {
            ...event,
            content: restoreInString(safe, tokenMap),
            tool_calls: [],
          };
          return of(restoredChunk);
        }

        if (event.type !== ChatCompletionEventType.ChatCompletionMessage) {
          return of(event);
        }

        const flushed = holdBuffer;
        holdBuffer = '';
        const responseText = event.content ?? '';

        logger.debug(
          () =>
            `[hook-anon-debug] llmMessage sessionId=${sessionId} tokenMapSize=${tokenMap.size} ` +
            `toolCallCount=${event.toolCalls?.length ?? 0} contentLen=${responseText.length}`
        );

        return from(
          resolveRestoredText({
            anonymizationHookInvoker,
            config,
            logger,
            sessionId,
            responseText,
            capabilities,
          })
        ).pipe(
          mergeMap((restoredText) => {
            const restoredToolCalls = event.toolCalls?.map((tc) => ({
              ...tc,
              function: {
                ...tc.function,
                // restoreInValue preserves structure; the type is the same as the input.
                arguments: restoreInValue(
                  tc.function.arguments,
                  tokenMap
                ) as typeof tc.function.arguments,
              },
            }));

            event.toolCalls?.forEach((tc, idx) => {
              const afterTc = restoredToolCalls?.[idx];
              if (afterTc) {
                logDebugToolCallRestore({
                  logger,
                  sessionId,
                  toolName: tc.function.name,
                  toolCallId: tc.toolCallId,
                  argsBefore: tc.function.arguments,
                  argsAfter: afterTc.function.arguments,
                  tokenMap,
                });
              }
            });

            const flushChunk: ChatCompletionChunkEvent = {
              type: ChatCompletionEventType.ChatCompletionChunk,
              content: restoreInString(flushed, tokenMap),
              tool_calls: (restoredToolCalls ?? []).map((tc, idx) => {
                let args = '';
                try {
                  args = JSON.stringify(tc.function.arguments) ?? '';
                } catch {
                  args = String(tc.function.arguments ?? '');
                }
                return {
                  index: idx,
                  toolCallId: tc.toolCallId,
                  function: { name: tc.function.name, arguments: args },
                };
              }),
            };

            const restoredMessage: ChatCompletionMessageEvent = {
              ...event,
              content: restoredText,
              ...(restoredToolCalls !== undefined ? { toolCalls: restoredToolCalls } : {}),
            };

            return of(flushChunk as ChatCompletionEvent, restoredMessage as ChatCompletionEvent);
          })
        );
      })
    );
  };
};
