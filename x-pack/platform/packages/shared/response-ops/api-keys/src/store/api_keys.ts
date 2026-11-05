/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeApiKeyId, isUiamCredential } from '@kbn/core-security-server';

/** An Elasticsearch API key. */
export interface EsApiKey {
  id: string;
  /** `base64(id:secret)`, sent as-is after `ApiKey `. */
  encoded: string;
}

/** A UIAM API key. */
export interface UiamApiKey {
  /** Absent for a user-created Cloud API key, which is a raw `essu_` secret with no id. */
  id?: string;
  /** The raw `essu_` secret, sent as-is after `ApiKey `. */
  secret: string;
  /** UIAM's verdict that the key is user-created, so requests must not carry the shared secret. */
  external: boolean;
}

/**
 * The API keys a plugin creates, stores and runs with. Every plugin maps its own saved object
 * fields to and from this shape, and the rest of the package only works with it.
 */
export interface ApiKeys {
  /** The keys are the caller's own. Kibana never invalidates them. */
  createdByUser: boolean;
  es?: EsApiKey;
  uiam?: UiamApiKey;
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

/** Reads a stored `base64(id:secret)` Elasticsearch key. The id is empty when it can't be decoded. */
export const toEsApiKey = (encoded: string, id = decodeApiKeyId(encoded) ?? ''): EsApiKey => ({
  id,
  encoded,
});

/** Reads a stored UIAM key: `base64(id:essu_…)`, or a raw `essu_…` secret. */
export const toUiamApiKey = (
  stored: string,
  { id = getUiamApiKeyId(stored), external }: { id?: string; external?: boolean | null } = {}
): UiamApiKey => ({
  ...(id ? { id } : {}),
  secret: getUiamApiKeySecret(stored),
  external: external === true,
});

/** The value to store for a UIAM key: `base64(id:essu_…)`, or the raw secret when there's no id. */
export const encodeUiamApiKey = ({ id, secret }: UiamApiKey): string =>
  id ? encodeApiKey(id, secret) : secret;
