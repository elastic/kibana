/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ResolveScopedApiKeysOpts,
  ScopedApiKeysDeps,
  ScopedEsApiKey,
  ScopedUiamApiKey,
} from './types';

type GrantOpts = Pick<
  ResolveScopedApiKeysOpts,
  'refresh' | 'metadata' | 'onKeyCreated' | 'logTags'
>;

const refreshOptions = (refresh: GrantOpts['refresh']) =>
  refresh !== undefined ? { refresh } : {};

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Grants an Elasticsearch API key, or returns `null` when API keys are disabled. */
export const grantEsApiKey = async (
  request: KibanaRequest,
  { security }: ScopedApiKeysDeps,
  name: string,
  { refresh, metadata, onKeyCreated }: GrantOpts
): Promise<ScopedEsApiKey | null> => {
  const result = await security.authc.apiKeys.grantAsInternalUser(
    request,
    { name, role_descriptors: {}, metadata },
    refreshOptions(refresh)
  );
  if (!result) {
    return null;
  }

  onKeyCreated?.({ apiKeyId: result.id });
  return { id: result.id, secret: result.api_key, name: result.name };
};

/** Clones the request's Elasticsearch API key, or returns `null` when API keys are disabled. */
export const cloneEsApiKey = async (
  request: KibanaRequest,
  { security }: ScopedApiKeysDeps,
  name: string,
  { refresh, metadata, onKeyCreated }: GrantOpts
): Promise<ScopedEsApiKey | null> => {
  const result = await security.authc.apiKeys.cloneAsInternalUser(request, {
    name,
    metadata,
    ...refreshOptions(refresh),
  });
  if (!result) {
    return null;
  }

  onKeyCreated?.({ apiKeyId: result.id });
  return { id: result.id, secret: result.api_key, name: result.name };
};

/**
 * Grants a UIAM API key. When `required` is false a failure is logged and `undefined` is
 * returned, so the caller proceeds with its Elasticsearch key only.
 */
export const grantUiamApiKey = async (
  request: KibanaRequest,
  { security, logger }: ScopedApiKeysDeps,
  name: string,
  required: boolean,
  { onKeyCreated, logTags }: GrantOpts
): Promise<ScopedUiamApiKey | undefined> => {
  const uiam = security.authc.apiKeys.uiam;
  if (!uiam) {
    if (required) {
      throw new Error(`Failed to create UIAM API key "${name}": UIAM is not enabled`);
    }
    return undefined;
  }

  try {
    const result = await uiam.grant(request, { name });
    if (!result) {
      throw new Error(`Failed to create a Cloud API key "${name}"`);
    }
    onKeyCreated?.({ apiKeyId: result.id, uiamApiKey: result.api_key });
    return { id: result.id, secret: result.api_key, name: result.name };
  } catch (err) {
    logger.error(`Failed to create UIAM API key "${name}": ${errorMessage(err)}`, {
      tags: logTags?.grant,
      error: { stack_trace: err instanceof Error ? err.stack : undefined },
    });
    if (required) {
      throw err;
    }
    return undefined;
  }
};
