/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUiamCredential } from '@kbn/core-security-server';

/**
 * The API key fields a plugin persists, named after the alerting rule attributes.
 *
 * - `apiKey` is an Elasticsearch key stored as `base64(id:secret)`.
 * - `uiamApiKey` is `base64(id:essu_…)` for keys Kibana granted, or a raw `essu_…` secret for
 *   user-created Cloud keys (and for keys Task Manager granted).
 * - `uiamApiKeyId` is only needed when `uiamApiKey` is a raw secret Kibana owns, since the raw
 *   secret carries no id.
 */
export interface StoredApiKeys {
  apiKey?: string | null;
  uiamApiKey?: string | null;
  uiamApiKeyId?: string | null;
  apiKeyCreatedByUser?: boolean | null;
  uiamApiKeyExternal?: boolean | null;
}

/** One key to invalidate, in the shape of a pending-invalidation saved object. */
export interface InvalidationTarget {
  apiKeyId: string;
  uiamApiKey?: string;
  taskId?: string;
  taskStartedAt?: string;
}

export const encodeApiKey = (id: string, secret: string): string =>
  Buffer.from(`${id}:${secret}`).toString('base64');

/**
 * Splits a stored `base64(id:secret)` value. For anything else, such as a raw `essu_…` secret,
 * `secret` is absent and `id` is meaningless.
 */
export const decodeApiKey = (storedApiKey: string): { id: string; secret?: string } => {
  const [id, secret] = Buffer.from(storedApiKey, 'base64').toString().split(':');
  return { id, secret };
};

/**
 * Returns the raw `essu_…` secret UIAM expects on the wire. Only the raw secret authenticates:
 * Elasticsearch parses the `base64(id:essu_…)` envelope as a native key and never reaches UIAM.
 * Values in neither shape are returned untouched.
 */
export const getUiamApiKeySecret = (storedUiamApiKey: string): string => {
  if (isUiamCredential(storedUiamApiKey)) {
    return storedUiamApiKey;
  }
  const { secret } = decodeApiKey(storedUiamApiKey);
  return secret && isUiamCredential(secret) ? secret : storedUiamApiKey;
};

/** Returns the id of a stored `base64(id:essu_…)` UIAM key. Raw `essu_…` secrets carry no id. */
export const getUiamApiKeyId = (storedUiamApiKey?: string | null): string | undefined => {
  if (!storedUiamApiKey || isUiamCredential(storedUiamApiKey)) {
    return undefined;
  }
  const { id, secret } = decodeApiKey(storedUiamApiKey);
  return id && secret && isUiamCredential(secret) ? id : undefined;
};

const toInvalidationTarget = (storedApiKey: string): InvalidationTarget | undefined => {
  if (isUiamCredential(storedApiKey)) {
    return undefined;
  }
  const { id, secret } = decodeApiKey(storedApiKey);
  return { apiKeyId: id, ...(secret && isUiamCredential(secret) ? { uiamApiKey: secret } : {}) };
};

/**
 * Returns the keys Kibana owns and should invalidate. User-created keys are never invalidated,
 * and a raw `essu_…` secret without a stored id can't be targeted.
 */
export const getInvalidationTargets = (stored: StoredApiKeys): InvalidationTarget[] => {
  const { apiKey, uiamApiKey, uiamApiKeyId, apiKeyCreatedByUser } = stored;
  if (apiKeyCreatedByUser) {
    return [];
  }

  const targets: InvalidationTarget[] = [];
  const esTarget = apiKey ? toInvalidationTarget(apiKey) : undefined;
  if (esTarget) {
    targets.push(esTarget);
  }

  if (uiamApiKey && uiamApiKeyId) {
    targets.push({ apiKeyId: uiamApiKeyId, uiamApiKey });
  } else if (uiamApiKey) {
    const uiamTarget = toInvalidationTarget(uiamApiKey);
    if (uiamTarget) {
      targets.push(uiamTarget);
    }
  }

  return targets;
};
