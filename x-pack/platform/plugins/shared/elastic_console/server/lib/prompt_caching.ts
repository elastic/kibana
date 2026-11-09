/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompleteCacheControl } from '@kbn/inference-common';

export const MAX_SESSION_ID_LENGTH = 256;

/**
 * Headers (in priority order) that clients can use to provide a session id.
 * `x-session-id` matches the OpenRouter convention (used e.g. by the pi agent harness),
 * `x-session-affinity` matches the generic OpenAI-compatible affinity header.
 */
const SESSION_ID_HEADERS = ['x-session-id', 'x-session-affinity'] as const;

export type PromptCacheRetention = 'in_memory' | '24h';

export interface PromptCaching {
  sessionId?: string;
  cacheControl?: ChatCompleteCacheControl;
}

const normalize = (value: unknown): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_SESSION_ID_LENGTH) {
    return undefined;
  }
  return trimmed;
};

/**
 * Resolves the session id and cache-control directive used for EIS prompt caching from an
 * OpenAI-compatible request. The body `prompt_cache_key` wins over session headers.
 */
export const resolvePromptCaching = ({
  promptCacheKey,
  promptCacheRetention,
  headers,
}: {
  promptCacheKey?: string;
  promptCacheRetention?: PromptCacheRetention;
  headers: Readonly<Record<string, string | string[] | undefined>>;
}): PromptCaching => {
  const sessionId =
    normalize(promptCacheKey) ??
    SESSION_ID_HEADERS.map((name) => normalize(headers[name])).find(Boolean);

  if (!sessionId) {
    return {};
  }

  return {
    sessionId,
    cacheControl: { type: 'ephemeral', ttl: promptCacheRetention === '24h' ? '1h' : '5m' },
  };
};
