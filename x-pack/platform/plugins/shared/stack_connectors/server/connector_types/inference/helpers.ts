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

const REDACTED = '[redacted]';

// The ONE list of sensitive keys. It drives both the structured pass (JSON.stringify replacer) and
// the text pass in `redactUpstreamSecrets`. Keys are compared lower-cased with `-`, `_` and
// whitespace removed, so `api_key`, `apiKey` and `API-Key` (`access_token` / `accessToken`,
// `client_secret` / `clientSecret`, ...) all match.
const SENSITIVE_KEYS_EXACT = new Set([
  'authorization',
  'proxyauthorization',
  'cookie',
  'cookies',
  'setcookie',
  'credential',
  'credentials',
]);
const SENSITIVE_KEY_SUFFIXES = [
  'authorization', // http_authorization, x-forwarded-authorization
  'cookie', // http_cookie
  'password',
  'passwd',
  'token',
  'secret',
  'secrets',
  'secretkey',
  'secretaccesskey',
  // SigV4 signature: `Signature=<hex>` (the `Credential=` half is covered by `credential`)
  'signature',
];
const SENSITIVE_KEY_FRAGMENTS = [
  'apikey', // api_key, x-api-key, x-goog-api-key
  'accesskey',
  'privatekey',
  'passphrase',
  'clientassertion',
  'subscriptionkey', // Ocp-Apim-Subscription-Key (Azure APIM)
];
// `*token` keys that carry counts or vocabulary markers rather than credentials
const NON_SECRET_TOKEN_KEYS = new Set([
  'maxtoken',
  'prompttoken',
  'totaltoken',
  'completiontoken',
  'eostoken',
  'bostoken',
  'stoptoken',
  'padtoken',
]);

const normalizeKey = (key: string): string => key.toLowerCase().replace(/[-_\s]/g, '');

// A number is kept only under a key that names a token COUNT (`num_token`, `inputToken`,
// `usage.total_token`, ...). A number under any other sensitive `*token` key (`access_token`,
// `session_token`, `refresh_token`, ...) may be a credential and is redacted. Plural `*tokens`
// keys are not sensitive at all (see `isSensitiveKey`).
const COUNT_TOKEN_KEY =
  /(?:^|[-_\s])(?:num|count|max|min|input|output|prompt|completion|total|cached|reasoning|next)[-_\s]?tokens?$/;
const isTokenCountKey = (key: string): boolean =>
  COUNT_TOKEN_KEY.test(key.replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase());

const isSensitiveKey = (key: string): boolean => {
  const normalized = normalizeKey(key);
  if (NON_SECRET_TOKEN_KEYS.has(normalized)) return false;
  return (
    SENSITIVE_KEYS_EXACT.has(normalized) ||
    SENSITIVE_KEY_SUFFIXES.some((suffix) => normalized.endsWith(suffix)) ||
    SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment))
  );
};

// number of consecutive backslashes right before `index`
const backslashRun = (text: string, index: number): number => {
  let run = 0;
  while (index - run - 1 >= 0 && text[index - run - 1] === '\\') run++;
  return run;
};

// A quote delimits a string when it is escaped the same way the string opener was: plain text
// (`level` 0) uses an even backslash run, JSON embedded in a JSON string (`\"`, `\\\"`, ...) uses
// exactly `level` backslashes.
const isDelimiterQuote = (text: string, index: number, level: number): boolean => {
  const run = backslashRun(text, index);
  return level === 0 ? run % 2 === 0 : run === level;
};

// Returns the end (exclusive) of the bracket group starting at `start`, honouring quoted strings in
// both plain and escaped form. Fails closed: an unbalanced group runs to the end of the text.
const findBracketEnd = (text: string, start: number): number => {
  let depth = 0;
  let inString = false;
  let level = -1;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (level === -1) level = backslashRun(text, i);
      if (isDelimiterQuote(text, i, level)) inString = !inString;
    } else if (!inString) {
      if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth === 0) return i + 1;
      }
    }
  }
  return text.length;
};

const endOfLine = (text: string, from: number): number => {
  const newline = text.slice(from).search(/[\r\n]/);
  return newline === -1 ? text.length : from + newline;
};

const matchLength = (pattern: RegExp, text: string, index: number): number => {
  pattern.lastIndex = index;
  return pattern.exec(text)?.[0].length ?? 0;
};

const QUOTE_OPENER = /(\\*)(["'])/y;
const AUTHORIZATION_VALUE = /(?:[A-Za-z][\w-]*\s+)?[^\s"',}]+/y;
// `name="value"` is a legal cookie form: a double quote right after `=` opens a quoted value, any
// other quote still ends the span (it closes the string the header sits in).
const COOKIE_VALUE = /(?:[^\r\n"'}]|(?<==)"[^"\r\n]*")+/y;
// a `key=` query/form parameter ends at the next separator
const QUERY_PARAM_VALUE = /[^\s"',}&]+/y;
const SCALAR_VALUE = /[^\s"',}]+/y;
const NUMERIC_VALUE = /^-?\d+(?:\.\d+)?$/;

// A rest-of-line consumption (`cookie:` / `invalid_token:`) must not swallow a following sensitive
// key: in `invalid_token: abc123, password: "hunter2"` the consumed span would include
// `password: ` and stop before the quote, leaving the password value exposed after `[redacted]`
// (the keyed pass never re-reads a consumed span). Stop before the next sensitive key so the keyed
// pass redacts that key's own value.
const stopBeforeNextSensitiveKey = (text: string, start: number, candidateEnd: number): number => {
  const pattern = new RegExp(KEY_VALUE_PATTERN.source, KEY_VALUE_PATTERN.flags);
  pattern.lastIndex = start;
  let match = pattern.exec(text);
  while (match !== null && match.index < candidateEnd) {
    if (isSensitiveKey(match[1])) return match.index;
    match = pattern.exec(text);
  }
  return candidateEnd;
};

// Returns the end (exclusive) of the secret value starting at `start`.
const findSecretValueEnd = (text: string, key: string, start: number): number => {
  QUOTE_OPENER.lastIndex = start;
  const opener = QUOTE_OPENER.exec(text);
  if (opener) {
    // quoted string, plain (`"v"`) or escaped (`\"v\"`); an unterminated one runs to the line end
    const level = opener[1].length;
    const quote = opener[2];
    const contentStart = start + opener[0].length;
    for (let i = contentStart; i < text.length; i++) {
      if (text[i] === quote && isDelimiterQuote(text, i, level)) return i + 1;
    }
    return endOfLine(text, contentStart);
  }

  // fail closed on object/array values: consume the balanced group or, when it never closes,
  // everything up to the end of the text
  if (text[start] === '{' || text[start] === '[') return findBracketEnd(text, start);

  const normalized = normalizeKey(key);
  if (normalized.endsWith('authorization')) {
    return start + matchLength(AUTHORIZATION_VALUE, text, start);
  }
  if (normalized.endsWith('cookie') || normalized === 'cookies') {
    // Cookie names are arbitrary and attacker/provider-chosen (`sid`, `token`, `theme`,
    // `Signature`, ...), so per-name parsing leaks: `Cookie: token=abc123; sid=secret456`
    // must redact the whole header value. Consume to the end of the line (a multi-header
    // dump ends the value there); over-redacting a benign trailing cookie is fail-safe.
    return endOfLine(text, start);
  }
  // a bare `credentials` / `invalid_token` value that is not prose may be a multi-word secret
  // (`admin letmein`, `Basic abc==`, a passphrase): redact the rest of the line, not one token
  if (PROSE_KEYS.has(normalized)) {
    return stopBeforeNextSensitiveKey(text, start, start + matchLength(COOKIE_VALUE, text, start));
  }
  const length = matchLength(normalized === 'key' ? QUERY_PARAM_VALUE : SCALAR_VALUE, text, start);
  // numeric values under token-COUNT keys (`num_token: 5`) are not credentials
  if (isTokenCountKey(key) && NUMERIC_VALUE.test(text.slice(start, start + length))) return start;
  return start + length;
};

// The bare key `token` is only a credential at the start of a line or after a structural
// delimiter; elsewhere ("Unexpected token: <", "special token: <|im_end|>") it is prose.
const isStructuralPosition = (text: string, index: number): boolean => {
  let i = index - 1;
  while (i >= 0 && (text[i] === ' ' || text[i] === '\t')) i--;
  return i < 0 || /[\r\n{},&?;"']/.test(text[i]);
};

// Bare `credentials` / `invalid_token` also open ordinary prose ("Invalid credentials: { reason:
// "expired" } please rotate", "credentials: [missing] for provider", "invalid_token: The access
// token expired"). Only the bare (unquoted) key is exempted, and only when the value reads as a
// placeholder, prose, or (for `credentials`) a group whose keys are ALL known diagnostic keys.
// A quoted JSON key position (`"credentials":{...}`) always redacts.
const PROSE_KEYS = new Set(['credentials', 'invalidtoken']);
const PLACEHOLDER_VALUE =
  /\[(?:missing|none|null|empty|invalid|required|provided|not provided|not set|unset|omitted|hidden|expired)\]/iy;
// Prose must open with a function word and its second word must end at a word boundary, so
// `credentials: admin letmein`, `credentials: Basic dmVy...==` and `invalid_token: The hunter2`
// stay redacted.
const PROSE_WORDS_VALUE =
  /(?:the|an?|is|are|was|were|has|have|had|not|no|missing|invalid|expired|required|revoked|for|must|cannot|could|did|does|do)[ \t]+[a-z]{2,}(?![\w-])/iy;
const BARE_KEY_GROUP_VALUE =
  /\{[ \t]*(?:reason|message|error|detail|details|status|code|type|description)[ \t]*:/iy;
// Keys a `credentials` group may carry and still count as a diagnostic (non-secret) form.
const DIAGNOSTIC_GROUP_KEYS = new Set([
  'reason',
  'message',
  'error',
  'detail',
  'details',
  'status',
  'code',
  'type',
  'description',
]);
// Every key inside a diagnostic group must be a known non-secret diagnostic key:
// `{ reason: "expired" }` is prose, but `{ reason: "expired", value: "secret" }` or
// `{ reason: "expired", password: "hunter2" }` redacts the whole group (fail closed).
const isDiagnosticGroup = (group: string): boolean => {
  const pattern = new RegExp(KEY_VALUE_PATTERN.source, KEY_VALUE_PATTERN.flags);
  let match: RegExpExecArray | null;
  let sawKey = false;
  while ((match = pattern.exec(group)) !== null) {
    sawKey = true;
    if (!DIAGNOSTIC_GROUP_KEYS.has(normalizeKey(match[1]))) return false;
  }
  return sawKey;
};

const isProseValue = (
  text: string,
  key: string,
  match: RegExpExecArray,
  valueStart: number
): boolean => {
  const normalized = normalizeKey(key);
  if (!PROSE_KEYS.has(normalized)) return false;
  if (/^\\*["']/.test(match[0].slice(key.length))) return false;
  if (matchLength(PROSE_WORDS_VALUE, text, valueStart) > 0) return true;
  if (normalized !== 'credentials') return false;
  if (matchLength(PLACEHOLDER_VALUE, text, valueStart) > 0) return true;
  // a group only counts as prose mid-sentence; at a key position it stays fail-closed, and
  // only when every key inside the group is a known diagnostic key
  if (isStructuralPosition(text, match.index)) return false;
  if (matchLength(BARE_KEY_GROUP_VALUE, text, valueStart) === 0) return false;
  return isDiagnosticGroup(text.slice(valueStart, findBracketEnd(text, valueStart)));
};

// `key: value`, `key=value`, `"key":"value"` and the escaped forms found in JSON embedded in a
// string (`\"key\":\"value\"`).
const KEY_VALUE_PATTERN = /(?<![\w-])(api[ ]key|[A-Za-z_][\w-]*)(?:\\*["'])?\s*[:=]\s*/gi;

// The bare word `key` is a credential only as a `key=` query or form parameter (Google
// `?key=AIza...`, `grant=x&key=...`): right after `?` / `&` or at the start of the text. Prose
// (`key: value`, `the key=...` mid-sentence), JSON `"key":` members and `monkey=1` stay untouched.
const isQueryParamKey = (text: string, match: RegExpExecArray, key: string): boolean =>
  normalizeKey(key) === 'key' &&
  /^\s*=\s*$/.test(match[0].slice(key.length)) &&
  (match.index === 0 || /[?&]/.test(text[match.index - 1]));

const redactKeyedSecrets = (text: string): string => {
  const pattern = new RegExp(KEY_VALUE_PATTERN.source, KEY_VALUE_PATTERN.flags);
  let result = '';
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const key = match[1];
    if (!isSensitiveKey(key) && !isQueryParamKey(text, match, key)) continue;
    if (normalizeKey(key) === 'token' && !isStructuralPosition(text, match.index)) continue;
    const valueStart = match.index + match[0].length;
    if (isProseValue(text, key, match, valueStart)) continue;
    const valueEnd = findSecretValueEnd(text, key, valueStart);
    if (valueEnd <= valueStart) continue;
    result += `${text.slice(cursor, valueStart)}${REDACTED}`;
    cursor = valueEnd;
    pattern.lastIndex = valueEnd;
  }
  return result + text.slice(cursor);
};

// Credentials that appear with no key and no scheme in front of them (upstream prose, log lines,
// provider error bodies). Each pattern is anchored on the provider's own token format so prose and
// ordinary text cannot match.
const BARE_TOKEN_PATTERNS: RegExp[] = [
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, // AWS access key id
  /\bgh[pousr]_[A-Za-z0-9]{36}\b/g, // GitHub token
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, // Slack token
  /\bya29\.[A-Za-z0-9_-]+/g, // Google OAuth access token
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g, // bare JWT
  /\bAIza[0-9A-Za-z_-]{35}/g, // Google API key
  /\bhf_[A-Za-z0-9]{30,}/g, // Hugging Face token
  /\bgithub_pat_[A-Za-z0-9_]{22,}/g, // GitHub fine-grained personal access token
  /\bxapp-[A-Za-z0-9-]{10,}/g, // Slack app-level token
  // PEM private key block; an unterminated block (truncated body) runs to the end of the text
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
];

// An AWS secret access key (exactly 40 base64 chars) named in prose, with no `:` / `=` for the keyed
// pass to see: `the secret access key wJal... was rejected`. Anchored on the name before the value.
const AWS_SECRET_IN_PROSE =
  /((?<![A-Za-z0-9])secret[ _-]?(?:access[ _-]?)?key(?:[\s:="'\\]|\b(?:is|was)\b)+)[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/gi;

const redactBareTokens = (text: string): string =>
  BARE_TOKEN_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, REDACTED), text).replace(
    AWS_SECRET_IN_PROSE,
    `$1${REDACTED}`
  );

const redactUpstreamSecrets = (text: string): string =>
  redactKeyedSecrets(
    redactBareTokens(
      text
        .replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^\s:@\/"']+:)[^\s@/"']+@/gi, `$1${REDACTED}@`)
        .replace(/Bearer\s+[^\s"'\\]+/gi, `Bearer ${REDACTED}`)
        .replace(/sk-[A-Za-z0-9_-]{8,}/g, REDACTED)
    )
  );

// Replaces the WHOLE value (scalar, object or array) of a sensitive key. The text pass in
// `redactUpstreamSecrets` is the fallback for bodies that are not (complete) JSON.
const redactSensitiveKeysReplacer = (key: string, value: unknown): unknown =>
  key !== '' &&
  value !== null &&
  value !== undefined &&
  isSensitiveKey(key) &&
  !(typeof value === 'number' && isTokenCountKey(key))
    ? REDACTED
    : value;

const stringifyStructured = (value: unknown): string | undefined =>
  JSON.stringify(value, redactSensitiveKeysReplacer);

const stringifyUpstreamBody = (body: unknown): string => {
  if (body === undefined || body === null) return '';
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    const text = typeof body === 'string' ? body : body.toString('utf8');
    const trimmed = text.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return stringifyStructured(JSON.parse(text)) ?? text;
      } catch (e) {
        // not (complete) JSON: the text based redaction handles it
      }
    }
    return text;
  }
  try {
    return stringifyStructured(body) ?? '';
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
  if (text.length <= maxLength) return text;
  // A cap below the marker length must still cap: `text.slice(0, maxLength - marker.length)` with a
  // negative argument would drop the tail and then append the marker (length > maxLength).
  const cap = Math.max(0, maxLength);
  if (cap <= marker.length) return marker.slice(0, cap);
  return `${text.slice(0, cap - marker.length)}${marker}`;
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
