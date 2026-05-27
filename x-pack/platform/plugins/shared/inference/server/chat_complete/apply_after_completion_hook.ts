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

/** Plain-object token entry used by the by-value token map flow. */
interface TokenEntry {
  original: string;
  entityClass: string;
}

export interface AfterCompletionHookArgs {
  anonymizationHookInvoker: InvokeHookFn;
  config: InferenceConfig;
  logger: Logger;
  /** Must be the exact sessionId resolved by invokeBeforeCompletion. */
  sessionId: string;
  /** Token map produced by the beforeCompletion workflow run. */
  tokenMap: Record<string, TokenEntry>;
}

/**
 * Matches tokens produced by the anonymization pipeline: `<ENTITY_CLASS>_<32 hex chars>`.
 * Must stay in sync with the token format in inference_workflows/server/anonymization/generate_token.ts.
 */
const TOKEN_RESTORE_REGEX = /\b([A-Z][A-Z0-9_]*)_([0-9a-f]{32})\b/g;

/**
 * Matches the start of a potential token at the END of a buffered string.
 * Used by the sliding hold-buffer to avoid emitting a partial token that spans a chunk boundary.
 */
const PARTIAL_TOKEN_END_RE = /[A-Z][A-Z0-9_]*(?:_[0-9a-f]*)?$/;

export const restoreInString = (text: string, tokenMap: Record<string, TokenEntry>): string => {
  const re = new RegExp(TOKEN_RESTORE_REGEX.source, TOKEN_RESTORE_REGEX.flags);
  return text.replace(re, (fullMatch) => tokenMap[fullMatch]?.original ?? fullMatch);
};

/**
 * Recursively restores anonymization tokens in an arbitrary value.
 * Strings are restored via `restoreInString`; arrays and objects are walked recursively.
 * All other values pass through unchanged.
 */
export const restoreInValue = (value: unknown, tokenMap: Record<string, TokenEntry>): unknown => {
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

/**
 * RxJS operator that progressively restores anonymization tokens in a chat completion
 * stream. Used by the around hook path to restore tokens before the stream reaches
 * applyAfterCompletionHook.
 *
 * This operator accepts the legacy Map-based tokenMap from AnonymizationContext
 * (around-hook path, Commit D will migrate it to the plain-Record form).
 */
export const restoreTokensOperator = (
  tokenMap: AnonymizationContext['tokenMap']
): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent> => {
  const tokenRecord = Object.fromEntries(tokenMap.entries());
  return (source$) => {
    let holdBuffer = '';

    return source$.pipe(
      mergeMap((event) => {
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
            content: restoreInString(safe, tokenRecord),
            tool_calls: [],
          };
          return of(restoredChunk);
        }

        if (event.type === ChatCompletionEventType.ChatCompletionMessage) {
          const flushed = holdBuffer;
          holdBuffer = '';

          const restoredToolCalls = event.toolCalls?.map((tc) => ({
            ...tc,
            function: {
              ...tc.function,
              arguments: restoreInValue(
                tc.function.arguments,
                tokenRecord
              ) as typeof tc.function.arguments,
            },
          }));

          const flushChunk: ChatCompletionChunkEvent = {
            type: ChatCompletionEventType.ChatCompletionChunk,
            content: restoreInString(flushed, tokenRecord),
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
            content: restoreInString(event.content ?? '', tokenRecord),
            ...(restoredToolCalls !== undefined ? { toolCalls: restoredToolCalls } : {}),
          };

          return of(flushChunk as ChatCompletionEvent, restoredMessage as ChatCompletionEvent);
        }

        return of(event);
      })
    );
  };
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
  tokenMap: Record<string, TokenEntry>;
}): void => {
  const beforeStr = safeStringify(argsBefore);
  const afterStr = safeStringify(argsAfter);
  const patternsBefore = collectTokenPatterns(beforeStr);
  const patternsAfter = collectTokenPatterns(afterStr);
  const patternsNotInMap = patternsBefore.filter((t) => !(t in tokenMap));

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
 * Passes the tokenMap in the event payload so the workflow can route it to
 * transform.pii_restore without a capabilities side-channel.
 */
const resolveRestoredText = async ({
  anonymizationHookInvoker,
  config,
  logger,
  sessionId,
  responseText,
  tokenMap,
}: {
  anonymizationHookInvoker: InvokeHookFn;
  config: InferenceConfig;
  logger: Logger;
  sessionId: string;
  responseText: string;
  tokenMap: Record<string, TokenEntry>;
}): Promise<string> => {
  const result = await anonymizationHookInvoker(
    'inference.afterCompletion',
    { sessionId, response: responseText, tokenMap },
    {}
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
 */
export const applyAfterCompletionHook = ({
  anonymizationHookInvoker,
  config,
  logger,
  sessionId,
  tokenMap,
}: AfterCompletionHookArgs): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent> => {
  return (source$) => {
    let holdBuffer = '';

    return source$.pipe(
      mergeMap((event) => {
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
            `[hook-anon-debug] llmMessage sessionId=${sessionId} tokenMapSize=${
              Object.keys(tokenMap).length
            } ` + `toolCallCount=${event.toolCalls?.length ?? 0} contentLen=${responseText.length}`
        );

        return from(
          resolveRestoredText({
            anonymizationHookInvoker,
            config,
            logger,
            sessionId,
            responseText,
            tokenMap,
          })
        ).pipe(
          mergeMap((restoredText) => {
            const restoredToolCalls = event.toolCalls?.map((tc) => ({
              ...tc,
              function: {
                ...tc.function,
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
