/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import { getApiKeyFromRequest } from './request_api_key';
import { cloudApiKeyNotSupportedError, reuseRequestApiKey } from './reuse_request_api_key';
import { cloneEsApiKey, grantEsApiKey, grantUiamApiKey } from './grant';
import type {
  ResolveScopedApiKeysOpts,
  ResolveScopedApiKeysResult,
  ScopedApiKeysDeps,
  ScopedCredentials,
  ScopedEsApiKey,
  ScopedUiamApiKey,
} from './types';

const isUiamServiceAccount = (request: KibanaRequest, { security }: ScopedApiKeysDeps) => {
  const principal = security.authc.getPrincipal(request);
  return principal?.type === 'service_account' && principal.variant === 'uiam';
};

const isApiKeyRequest = (request: KibanaRequest, { security }: ScopedApiKeysDeps) =>
  request.isFakeRequest ||
  security.authc.getCurrentUser(request)?.authentication_type === 'api_key';

/** Whether the request carries a UIAM credential (raw `essu_` or a `base64(id:essu_)` envelope). */
const hasUiamCredential = (request: KibanaRequest) => {
  const header = HTTPAuthorizationHeader.parseFromRequest(request);
  if (header && isUiamCredential(header)) {
    return true;
  }
  const apiKey = getApiKeyFromRequest(request)?.api_key;
  return Boolean(apiKey && isUiamCredential(apiKey));
};
const grantUiamOnly = async (
  request: KibanaRequest,
  deps: ScopedApiKeysDeps,
  opts: ResolveScopedApiKeysOpts
): Promise<ResolveScopedApiKeysResult> => {
  const credentials = new Map<string, ScopedCredentials>();
  for (const [key, names] of opts.names) {
    if (!opts.uiamEnabled) {
      throw new Error(`Failed to create UIAM API key "${names.uiam}": UIAM is not enabled`);
    }
    const uiam = await grantUiamApiKey(request, deps, names.uiam, true, opts);
    if (!uiam) {
      throw new Error(`Failed to create UIAM API key "${names.uiam}"`);
    }
    credentials.set(key, { uiam, createdByUser: false });
  }
  return { enabled: true, credentials };
};

const grantUiamForNames = async (
  request: KibanaRequest,
  deps: ScopedApiKeysDeps,
  opts: ResolveScopedApiKeysOpts
): Promise<Map<string, ScopedUiamApiKey>> => {
  const keys = new Map<string, ScopedUiamApiKey>();
  if (!opts.uiamEnabled) {
    return keys;
  }

  if (!hasUiamCredential(request)) {
    deps.logger.debug(
      'Request credential is not UIAM-compatible, skipping UIAM API key grant. Only ES API keys will be used.',
      { tags: opts.logTags?.credentials }
    );
    return keys;
  }

  for (const [key, names] of opts.names) {
    const uiam = await grantUiamApiKey(request, deps, names.uiam, opts.uiamRequired === true, opts);
    if (uiam) {
      keys.set(key, uiam);
    }
  }
  return keys;
};

const mintEsForNames = async (
  mint: typeof grantEsApiKey,
  request: KibanaRequest,
  deps: ScopedApiKeysDeps,
  opts: ResolveScopedApiKeysOpts
): Promise<Map<string, ScopedEsApiKey> | null> => {
  const keys = new Map<string, ScopedEsApiKey>();
  for (const [key, names] of opts.names) {
    const es = await mint(request, deps, names.es, opts);
    if (!es) {
      return null;
    }
    keys.set(key, es);
  }
  return keys;
};

const grant = async (
  request: KibanaRequest,
  deps: ScopedApiKeysDeps,
  opts: ResolveScopedApiKeysOpts
): Promise<ResolveScopedApiKeysResult> => {
  if (opts.storage === 'single' && opts.uiamEnabled) {
    return grantUiamOnly(request, deps, opts);
  }

  // UIAM first, so a required UIAM key fails before an Elasticsearch key exists.
  const uiamKeys =
    opts.storage === 'single' ? new Map() : await grantUiamForNames(request, deps, opts);
  const esKeys = await mintEsForNames(grantEsApiKey, request, deps, opts);
  if (!esKeys) {
    return { enabled: false };
  }

  const credentials = new Map<string, ScopedCredentials>();
  for (const [key, es] of esKeys) {
    const uiam = uiamKeys.get(key);
    credentials.set(key, { es, ...(uiam ? { uiam } : {}), createdByUser: false });
  }
  return { enabled: true, credentials };
};

const clone = async (
  request: KibanaRequest,
  deps: ScopedApiKeysDeps,
  opts: ResolveScopedApiKeysOpts
): Promise<ResolveScopedApiKeysResult> => {
  // The Elasticsearch clone API rejects UIAM credentials, so a UIAM caller gets a fresh UIAM key.
  if (hasUiamCredential(request)) {
    if (!opts.uiamEnabled) {
      throw cloudApiKeyNotSupportedError();
    }
    return grantUiamOnly(request, deps, opts);
  }

  const esKeys = await mintEsForNames(cloneEsApiKey, request, deps, opts);
  if (!esKeys) {
    return { enabled: false };
  }

  const credentials = new Map<string, ScopedCredentials>();
  for (const [key, es] of esKeys) {
    credentials.set(key, { es, createdByUser: false });
  }
  return { enabled: true, credentials };
};

const reuse = (
  request: KibanaRequest,
  deps: ScopedApiKeysDeps,
  opts: ResolveScopedApiKeysOpts
): ResolveScopedApiKeysResult => {
  const reused = reuseRequestApiKey(request, deps, opts);
  const credentials = new Map<string, ScopedCredentials>();
  for (const key of opts.names.keys()) {
    credentials.set(key, reused);
  }
  return { enabled: true, credentials };
};

/**
 * Resolves the API keys a consumer stores for the objects it creates on behalf of the request:
 * reuses the caller's own key, clones it, or grants new Elasticsearch and UIAM keys.
 */
export const resolveScopedApiKeys = async (
  request: KibanaRequest,
  deps: ScopedApiKeysDeps,
  opts: ResolveScopedApiKeysOpts
): Promise<ResolveScopedApiKeysResult> => {
  // Elasticsearch cannot grant a key for a UIAM service account, so its UIAM key is its only one.
  if (isUiamServiceAccount(request, deps)) {
    return grantUiamOnly(request, deps, opts);
  }

  const mode = opts.mode ?? 'auto';
  if (mode === 'grant') {
    return grant(request, deps, opts);
  }
  if (mode === 'clone') {
    return clone(request, deps, opts);
  }
  if (mode === 'reuse') {
    return reuse(request, deps, opts);
  }

  if (!isApiKeyRequest(request, deps)) {
    return grant(request, deps, opts);
  }
  // A fake request's key is borrowed from whoever built the request, so it is always cloned.
  return opts.clone || request.isFakeRequest
    ? clone(request, deps, opts)
    : reuse(request, deps, opts);
};
