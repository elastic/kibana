/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UIAM_ERROR_CODES } from '@kbn/core-security-common';

export type ApiKeyAuthErrorKind = 'missing' | 'revoked' | 'expired' | 'rejected';

/**
 * Code UIAM returns when a cloud API key is past its expiration. `UIAM_ERROR_CODES.TOKEN_EXPIRED`
 * covers session tokens only; this one was observed from the UIAM service for an expired API key.
 */
export const UIAM_API_KEY_EXPIRED_ERROR_CODE = '0xE436AE';

/** UIAM error codes that Elasticsearch embeds in the reason when it rejects a cloud API key. */
export const API_KEY_AUTH_ERROR_CODES: Readonly<Record<string, ApiKeyAuthErrorKind>> = {
  [UIAM_ERROR_CODES.APIKEY_MISSING]: 'missing',
  [UIAM_ERROR_CODES.APIKEY_REVOKED]: 'revoked',
  [UIAM_ERROR_CODES.TOKEN_EXPIRED]: 'expired',
  [UIAM_API_KEY_EXPIRED_ERROR_CODE]: 'expired',
};

/**
 * Markers found in a rule's last execution error message when Elasticsearch rejected the
 * rule's API key. UIAM failures carry an error code (e.g. `[0x28D520]`); plain Elasticsearch
 * API keys fail with a `security_exception` reason instead.
 */
export const API_KEY_AUTH_ERROR_MARKERS: ReadonlyArray<{
  kind: ApiKeyAuthErrorKind;
  marker: string;
}> = [
  ...Object.entries(API_KEY_AUTH_ERROR_CODES).map(([marker, kind]) => ({ kind, marker })),
  { kind: 'revoked', marker: 'api key has been invalidated' },
  { kind: 'expired', marker: 'api key is expired' },
  { kind: 'rejected', marker: 'failed to authenticate cloud API key' },
  { kind: 'rejected', marker: 'unable to authenticate with provided credentials' },
  { kind: 'rejected', marker: 'missing authentication credentials' },
];

/** Classifies an execution error message as an API key authentication failure, if it is one. */
export const getApiKeyAuthErrorKind = (
  message: string | null | undefined
): ApiKeyAuthErrorKind | undefined => {
  if (!message) {
    return undefined;
  }
  const lowerMessage = message.toLowerCase();
  return API_KEY_AUTH_ERROR_MARKERS.find(({ marker }) =>
    lowerMessage.includes(marker.toLowerCase())
  )?.kind;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Lucene regular expression matching any API key authentication failure message. Used as a
 * `terms` aggregation `include` so the health endpoint can count affected rules.
 */
export const API_KEY_AUTH_ERROR_MESSAGE_REGEX = `.*(${API_KEY_AUTH_ERROR_MARKERS.map(({ marker }) =>
  escapeRegex(marker)
).join('|')}).*`;
