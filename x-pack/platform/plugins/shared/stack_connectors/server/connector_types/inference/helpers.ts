/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last, lastValueFrom, map, merge, Observable, scan, share } from 'rxjs';
import type { Readable } from 'node:stream';
import { createParser } from 'eventsource-parser';
import type { UnifiedChatCompleteResponse } from '@kbn/connector-schemas/inference';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { MAX_STREAM_DURATION_MS } from '@kbn/inference-common';

// TODO: Extract to the common package with appex-ai
export function eventSourceStreamIntoObservable(
  readable: Readable,
  { maxDurationMs = MAX_STREAM_DURATION_MS }: { maxDurationMs?: number } = {}
) {
  return new Observable<string>((subscriber) => {
    const parser = createParser({
      onEvent: (event) => {
        subscriber.next(event.data);
      },
    });

    let tornDown = false;
    const deadline = Date.now() + maxDurationMs;
    const createTimeoutError = () =>
      new Error(`Inference stream exceeded the maximum allowed duration of ${maxDurationMs}ms`);

    // idle-stream guard only: a busy stream drains on the microtask queue,
    // starving timers — the in-band deadline check below covers that case
    const maxDurationTimer = setTimeout(() => {
      readable.destroy(createTimeoutError());
    }, maxDurationMs);

    async function processStream() {
      for await (const chunk of readable) {
        if (Date.now() > deadline) {
          throw createTimeoutError();
        }
        parser.feed(chunk.toString());
        // yield a macrotask per chunk so timers and cancellation stay serviced
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    processStream().then(
      () => {
        subscriber.complete();
      },
      (error) => {
        // teardown destroy rejects the iteration; don't surface it after unsubscribe
        if (!tornDown) {
          subscriber.error(error);
        }
      }
    );

    return () => {
      tornDown = true;
      clearTimeout(maxDurationTimer);
      readable.destroy();
    };
  });
}

export function chunksIntoMessage(obs$: Observable<UnifiedChatCompleteResponse>) {
  const shared$ = obs$.pipe(share());

  return lastValueFrom(
    merge(
      shared$,
      shared$.pipe(
        scan(
          (prev, chunk) => {
            if (chunk.choices.length > 0 && !chunk.usage) {
              prev.choices[0].message.content += chunk.choices[0].message.content ?? '';
              if (chunk.choices[0].message.refusal) {
                prev.choices[0].message.refusal = chunk.choices[0].message.refusal;
              }

              chunk.choices[0].message.tool_calls?.forEach((toolCall) => {
                if (toolCall.index !== undefined) {
                  const prevToolCallLength = prev.choices[0].message.tool_calls?.length ?? 0;
                  if (prevToolCallLength - 1 !== toolCall.index) {
                    if (!prev.choices[0].message.tool_calls) {
                      prev.choices[0].message.tool_calls = [];
                    }
                    prev.choices[0].message.tool_calls.push({
                      function: {
                        name: '',
                        arguments: '',
                      },
                      id: '',
                    });
                  }
                  const prevToolCall = prev.choices[0].message.tool_calls[toolCall.index];

                  if (toolCall.function?.name) {
                    prevToolCall.function.name += toolCall.function?.name;
                  }
                  if (toolCall.function?.arguments) {
                    prevToolCall.function.arguments += toolCall.function?.arguments;
                  }
                  if (toolCall.id) {
                    prevToolCall.id += toolCall.id;
                  }
                  if (toolCall.type) {
                    prevToolCall.type = toolCall.type;
                  }
                }
              });
            } else if (chunk.usage) {
              prev.usage = chunk.usage;
            }
            return { ...prev, id: chunk.id, model: chunk.model };
          },
          {
            choices: [
              {
                message: {
                  content: '',
                  refusal: null,
                  role: 'assistant',
                },
              },
            ],
            object: 'chat.completion',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any
        ),
        last(),
        map((concatenatedChunk): UnifiedChatCompleteResponse => {
          // TODO: const validatedToolCalls = validateToolCalls(concatenatedChunk.choices[0].message.tool_calls);
          if (concatenatedChunk.choices[0].message.content === '') {
            concatenatedChunk.choices[0].message.content = null;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          concatenatedChunk.choices[0].message.tool_calls?.forEach((toolCall: any) => {
            if (toolCall.function?.arguments?.trim() === '') {
              toolCall.function.arguments = '{}';
            }
          });
          return concatenatedChunk;
        })
      )
    )
  );
}

/**
 * Checks for 429 error due to user exceeding thier quote and creates and throws a user error if appropriate.
 * This is a temporary measure until the backend is updated to return the original error code instead of a general 400 (https://github.com/elastic/elasticsearch/issues/139710).
 */
export const detectandThrowUserError = (error: string) => {
  if (error.includes('status [429]') && error.includes('quota')) {
    throw createTaskRunError(new Error(truncateUpstreamBody(error)), TaskErrorSource.USER);
  }
};

export const MAX_UPSTREAM_BODY_LENGTH = 1000;

const redactUpstreamSecrets = (text: string): string =>
  text
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^\s:@\/"']+:)[^\s@/"']+@/gi, '$1[redacted]@')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '[redacted]')
    .replace(
      /(authorization["']?\s*[:=]\s*["']?)(?:[A-Za-z][\w-]*\s+)?[^\s"',}]+/gi,
      '$1[redacted]'
    )
    .replace(
      /(^|[{},&?;"'])\s*(token["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|"[^"\n]*|'[^'\n]*|[^\s"',}]+)/gim,
      '$1$2[redacted]'
    )
    .replace(
      /\b((?:api[-_ ]?key|password|passwd|(?:[\w-]+_)?secret(?:_key)?|private_key|aws_secret_access_key|credential|(?:access|refresh|id|auth|session|hf|api|bearer|user)_token|accessToken|clientSecret|refreshToken|idToken)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|"[^"\n]*|'[^'\n]*|[^\s"',}]+)/gi,
      '$1[redacted]'
    )
    .replace(
      /([A-Z][A-Z0-9_]{0,63}(?:_API_KEY|_TOKEN|_SECRET|_PASSWORD)\s*=\s*["']?)[^\s"',}]+/g,
      '$1[redacted]'
    );

const stringifyUpstreamBody = (body: unknown): string => {
  if (body === undefined || body === null) return '';
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  try {
    return JSON.stringify(body) ?? '';
  } catch (e) {
    return String(body);
  }
};

/**
 * Stringifies an upstream response body and caps its length so that it can safely be
 * included in an error message.
 */
export const truncateUpstreamBody = (
  body: unknown,
  maxLength: number = MAX_UPSTREAM_BODY_LENGTH
): string => {
  const text = redactUpstreamSecrets(stringifyUpstreamBody(body));
  const marker = '... [truncated]';
  return text.length > maxLength ? `${text.slice(0, maxLength - marker.length)}${marker}` : text;
};

/**
 * Builds a human readable message out of an error thrown while calling the inference endpoint.
 * Handles AxiosError-shaped (response.status / response.data) and Elasticsearch client
 * ResponseError-shaped (statusCode / body / meta) errors, as well as plain errors. Never throws.
 */
interface ErrorLike {
  message?: unknown;
  response?: { status?: unknown; data?: unknown };
  statusCode?: unknown;
  status?: unknown;
  body?: unknown;
  data?: unknown;
  meta?: { statusCode?: unknown; body?: unknown };
}

export const buildInferenceErrorMessage = (error: unknown): string => {
  try {
    if (error === undefined || error === null) return 'Unknown error';
    if (typeof error === 'string') return truncateUpstreamBody(error);

    const err = error as ErrorLike;
    const baseMessage = typeof err.message === 'string' ? err.message : '';
    const statusCode = err.response?.status ?? err.statusCode ?? err.status ?? err.meta?.statusCode;
    const rawBody = err.response?.data ?? err.body ?? err.data ?? err.meta?.body;
    // redact before assembling the prefixed message: the token pattern is
    // anchored to line starts / structural delimiters, which the
    // `Upstream response: ` prefix would otherwise break
    const body = redactUpstreamSecrets(stringifyUpstreamBody(rawBody));

    const parts: string[] = [];
    if (baseMessage) parts.push(baseMessage);
    if (
      statusCode !== undefined &&
      statusCode !== null &&
      !baseMessage.includes(`status code ${statusCode}`)
    ) {
      parts.push(`Status code: ${statusCode}`);
    }
    if (body && !baseMessage.includes(body)) {
      parts.push(`Upstream response: ${body}`);
    }
    if (parts.length > 0) return truncateUpstreamBody(parts.join('. '));

    const fallback = truncateUpstreamBody(err);
    return fallback && fallback !== '{}' ? fallback : 'Unknown error';
  } catch (e) {
    return 'Unknown error';
  }
};
