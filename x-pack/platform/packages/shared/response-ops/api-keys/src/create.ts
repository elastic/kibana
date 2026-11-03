/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { GrantAPIKeyResult, SecurityServiceStart } from '@kbn/core-security-server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import { errorDetails, UiamUnavailableError } from './errors';
import type { UiamLogTags } from './log_tags';
import { decodeApiKey } from './stored_keys';

export interface ClientContext {
  security: SecurityServiceStart;
  logger: Logger;
  tags: UiamLogTags;
  uiamEnabled: boolean;
}

/** Keys freshly created by Kibana, exactly as the security APIs returned them. */
export interface ApiKeys {
  es?: GrantAPIKeyResult;
  uiam?: GrantAPIKeyResult;
}

export interface CreateOptions {
  name: string;
  metadata: Record<string, unknown>;
  /** Names what the key is for in errors and logs, e.g. `alerting rule : my-rule`. */
  subject: string;
  /**
   * `optional`: a failed UIAM grant is logged and the ES key is still created.
   * `required`: a failed UIAM grant fails the whole call.
   * Requests without UIAM credentials never get a UIAM key, in either mode.
   */
  uiam: 'optional' | 'required';
}

/** The API key the caller authenticated with. */
export type RequestApiKey =
  | { type: 'es'; id: string; secret: string }
  | { type: 'uiam'; id?: string; secret: string; external: boolean }
  | { type: 'invalid' };

const isUiamRequest = (request: KibanaRequest): boolean => {
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  return !!authorizationHeader && isUiamCredential(authorizationHeader);
};

const grantUiam = async (
  context: ClientContext,
  request: KibanaRequest,
  { name, subject, uiam }: CreateOptions,
  { only }: { only: boolean }
): Promise<GrantAPIKeyResult | undefined> => {
  const { security, logger, tags, uiamEnabled } = context;
  if (!uiamEnabled) {
    if (only) {
      throw new UiamUnavailableError(
        `Failed to create UIAM API key for ${subject}: UIAM is not enabled`
      );
    }
    return;
  }

  if (!isUiamRequest(request)) {
    const message = `Failed to create UIAM API key for ${subject}: Invalid or missing UIAM credentials`;
    if (only) {
      throw new UiamUnavailableError(message);
    }
    logger.error(message, { tags: tags.credentials });
    return;
  }

  try {
    const result = await security.authc.apiKeys.uiam?.grant(request, { name: `uiam-${name}` });
    if (!result) {
      throw new Error(`Failed to create a Cloud API key for ${subject}`);
    }
    return result;
  } catch (err) {
    const { message, stack } = errorDetails(err);
    logger.error(`Failed to create UIAM API key for ${subject}: ${message}`, {
      tags: tags.grant,
      error: { stack_trace: stack },
    });
    if (only || uiam === 'required') {
      throw err;
    }
    return;
  }
};

export const invalidateUiamApiKey = async (
  { security, logger, tags }: ClientContext,
  request: KibanaRequest,
  subject: string,
  id: string
): Promise<void> => {
  const result = await security.authc.apiKeys.uiam?.invalidate(request, { id });
  if (result && result.error_count > 0) {
    logger.error(
      `Failed to invalidate UIAM API key for ${subject}: ${result.error_details
        ?.map((error) => error.reason)
        .join(', ')}`,
      { tags: tags.invalidate }
    );
  }
};

/**
 * Grants an ES key and, when the request carries UIAM credentials, a UIAM key. A UIAM service
 * account only gets a UIAM key, since Elasticsearch can't grant one for it. Returns `null` when
 * API keys are disabled.
 */
export const grant = async (
  context: ClientContext,
  request: KibanaRequest,
  options: CreateOptions & { refresh?: boolean | 'wait_for' }
): Promise<ApiKeys | null> => {
  const { security } = context;
  const { name, metadata, subject, refresh } = options;

  const principal = security.authc.getPrincipal(request);
  if (principal?.type === 'service_account' && principal.variant === 'uiam') {
    return { uiam: await grantUiam(context, request, options, { only: true }) };
  }

  const uiam = await grantUiam(context, request, options, { only: false });

  let es: GrantAPIKeyResult | null;
  try {
    es = await security.authc.apiKeys.grantAsInternalUser(
      request,
      { name, role_descriptors: {}, metadata },
      { refresh }
    );
  } catch (err) {
    if (uiam?.id) {
      await invalidateUiamApiKey(context, request, subject, uiam.id);
    }
    throw err;
  }

  if (!es) {
    if (uiam?.id) {
      await invalidateUiamApiKey(context, request, subject, uiam.id);
    }
    return null;
  }

  return { es, ...(uiam ? { uiam } : {}) };
};

/**
 * Clones the caller's ES API key. UIAM keys can't be cloned, so a UIAM caller gets a freshly
 * granted UIAM key instead; `uiam` is absent when that isn't possible.
 */
export const clone = async (
  context: ClientContext,
  request: KibanaRequest,
  options: CreateOptions
): Promise<ApiKeys> => {
  if (isUiamRequest(request)) {
    const uiam = await grantUiam(context, request, options, { only: false });
    return uiam ? { uiam } : {};
  }

  const { name, metadata } = options;
  const es = await context.security.authc.apiKeys.cloneAsInternalUser(request, { name, metadata });
  if (!es) {
    throw new Error('API key clone returned null (security feature may be disabled)');
  }
  return { es };
};

/** Parses the API key the request is authenticated with. `null` when there are no credentials. */
export const fromRequest = (
  { security }: ClientContext,
  request: KibanaRequest
): RequestApiKey | null => {
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  if (!authorizationHeader?.credentials) {
    return null;
  }

  const external = security.authc.getCurrentUser(request)?.api_key?.internal === false;
  if (isUiamCredential(authorizationHeader)) {
    return { type: 'uiam', secret: authorizationHeader.credentials, external };
  }

  const { id, secret } = decodeApiKey(authorizationHeader.credentials);
  if (!id || !secret) {
    return { type: 'invalid' };
  }
  return isUiamCredential(secret)
    ? { type: 'uiam', id, secret, external }
    : { type: 'es', id, secret };
};
