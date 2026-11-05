/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { GrantAPIKeyResult } from '@kbn/core-security-server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import { CloudApiKeyNotSupportedError, errorDetails, UiamUnavailableError } from '../errors';
import type { ApiKeys, UiamApiKey } from '../store/api_keys';
import { encodeApiKey } from '../store/api_keys';
import type { ClientContext, CreateOptions } from './types';

export const isUiamRequest = (request: KibanaRequest): boolean => {
  const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  return !!authorizationHeader && isUiamCredential(authorizationHeader);
};

export const isUiamServiceAccount = (
  { security }: Pick<ClientContext, 'security'>,
  request: KibanaRequest
): boolean => {
  const principal = security.authc.getPrincipal(request);
  return principal?.type === 'service_account' && principal.variant === 'uiam';
};

export const isUiamEnabled = (
  { uiamEnabled }: ClientContext,
  { esOnly }: Pick<CreateOptions, 'esOnly'>
): boolean => uiamEnabled && esOnly !== true;

const toGrantedUiamApiKey = ({ id, api_key: secret }: GrantAPIKeyResult): UiamApiKey => ({
  id,
  secret,
  external: false,
});

const grantUiam = async (
  context: ClientContext,
  request: KibanaRequest,
  options: CreateOptions,
  { required }: { required: boolean }
): Promise<GrantAPIKeyResult | undefined> => {
  const { security, logger, tags, profile } = context;
  const { name, subject, uiamName, onKeyCreated } = options;
  if (!isUiamEnabled(context, options)) {
    if (required) {
      throw new UiamUnavailableError(
        `Failed to create UIAM API key for ${subject}: UIAM is not enabled`
      );
    }
    return;
  }

  if (!isUiamRequest(request)) {
    const message = `Failed to create UIAM API key for ${subject}: Invalid or missing UIAM credentials`;
    if (required) {
      throw new UiamUnavailableError(message);
    }
    logger[profile.missingUiamCredentialsLogLevel ?? 'error'](message, {
      tags: tags.credentials,
    });
    return;
  }

  try {
    const result = await security.authc.apiKeys.uiam?.grant(request, {
      name: uiamName ?? `uiam-${name}`,
    });
    if (!result) {
      throw new Error(`Failed to create a Cloud API key for ${subject}`);
    }
    onKeyCreated?.('uiam', result);
    return result;
  } catch (err) {
    const { message, stack } = errorDetails(err);
    logger.error(`Failed to create UIAM API key for ${subject}: ${message}`, {
      tags: tags.grant,
      error: { stack_trace: stack },
    });
    if (required || profile.uiam === 'required') {
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
): Promise<boolean> => {
  const result = await security.authc.apiKeys.uiam?.invalidate(request, { id });
  if (result && result.error_count > 0) {
    logger.error(
      `Failed to invalidate UIAM API key for ${subject}: ${result.error_details
        ?.map((error) => error.reason)
        .join(', ')}`,
      { tags: tags.invalidate }
    );
    return false;
  }
  return true;
};

/** Invalidates a UIAM key whose ES counterpart couldn't be granted. Never throws. */
const rollbackUiamApiKey = async (
  context: ClientContext,
  request: KibanaRequest,
  subject: string,
  id: string
): Promise<void> => {
  try {
    await invalidateUiamApiKey(context, request, subject, id);
  } catch (err) {
    const { message, stack } = errorDetails(err);
    context.logger.error(`Failed to invalidate UIAM API key for ${subject}: ${message}`, {
      tags: context.tags.invalidate,
      error: { stack_trace: stack },
    });
  }
};

const refreshOption = (refresh: CreateOptions['refresh']) =>
  refresh !== undefined ? { refresh } : {};

/**
 * Grants new keys from the request's credentials: a UIAM key when the request carries UIAM
 * credentials, then an ES key. A UIAM service account, or the `only` UIAM mode while UIAM is
 * enabled, only gets a UIAM key. Returns `null` when API keys are disabled.
 */
export const grant = async (
  context: ClientContext,
  request: KibanaRequest,
  options: CreateOptions
): Promise<ApiKeys | null> => {
  const { security, profile } = context;
  const { name, subject, refresh, esOnly } = options;

  if (
    (isUiamServiceAccount(context, request) && !esOnly) ||
    (profile.uiam === 'only' && isUiamEnabled(context, options))
  ) {
    const uiam = await grantUiam(context, request, options, { required: true });
    return uiam ? { createdByUser: false, uiam: toGrantedUiamApiKey(uiam) } : null;
  }

  const uiam = await grantUiam(context, request, options, { required: false });

  let es: GrantAPIKeyResult | null;
  try {
    es = await security.authc.apiKeys.grantAsInternalUser(
      request,
      { name, role_descriptors: {}, metadata: profile.metadata },
      refreshOption(refresh)
    );
  } catch (err) {
    if (uiam?.id) {
      await rollbackUiamApiKey(context, request, subject, uiam.id);
    }
    throw err;
  }

  if (!es) {
    if (uiam?.id) {
      await rollbackUiamApiKey(context, request, subject, uiam.id);
    }
    return null;
  }

  options.onKeyCreated?.('es', es);
  return {
    createdByUser: false,
    es: { id: es.id, encoded: encodeApiKey(es.id, es.api_key) },
    ...(uiam ? { uiam: toGrantedUiamApiKey(uiam) } : {}),
  };
};

/**
 * Clones the caller's ES API key. UIAM keys can't be cloned, so a caller authenticated with a raw
 * UIAM key gets a freshly granted UIAM key instead.
 */
export const clone = async (
  context: ClientContext,
  request: KibanaRequest,
  options: CreateOptions
): Promise<ApiKeys> => {
  const { name, subject, refresh } = options;
  if (isUiamRequest(request)) {
    if (!isUiamEnabled(context, options)) {
      throw new CloudApiKeyNotSupportedError(subject);
    }
    const uiam = await grantUiam(context, request, options, { required: false });
    if (!uiam) {
      throw new UiamUnavailableError(`Failed to grant UIAM API key for ${subject}`);
    }
    return { createdByUser: false, uiam: toGrantedUiamApiKey(uiam) };
  }

  const es = await context.security.authc.apiKeys.cloneAsInternalUser(request, {
    name,
    metadata: context.profile.metadata,
    ...refreshOption(refresh),
  });
  if (!es) {
    throw new Error('API key clone returned null (security feature may be disabled)');
  }
  options.onKeyCreated?.('es', es);
  return { createdByUser: false, es: { id: es.id, encoded: encodeApiKey(es.id, es.api_key) } };
};
