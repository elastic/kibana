/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { decodeApiKeyId, isUiamCredential } from '@kbn/core-security-server';
import type { ClientContext } from './create';
import { invalidateUiamApiKey } from './create';
import { errorDetails } from './errors';
import { decodeApiKey, type InvalidationTarget, type StoredApiKeys } from './stored_keys';

const invalidateUiamNow = async (
  context: ClientContext,
  uiamApiKey: string,
  subject: string
): Promise<void> => {
  const { logger, tags } = context;
  const { id, secret } = decodeApiKey(uiamApiKey);
  if (!id || !secret || !isUiamCredential(secret)) {
    logger.error(
      `Failed to synchronously invalidate UIAM API key for ${subject}: stored credential is not a UIAM API key`,
      { tags: tags.invalidate }
    );
    return;
  }

  try {
    // `uiam.invalidate` authenticates with the key being revoked, whoever the caller is.
    const fakeRawRequest: FakeRawRequest = {
      headers: { authorization: `ApiKey ${secret}` },
      path: '/',
    };
    await invalidateUiamApiKey(context, kibanaRequestFactory(fakeRawRequest), subject, id);
  } catch (err) {
    const { message, stack } = errorDetails(err);
    logger.error(`Failed to synchronously invalidate UIAM API key for ${subject}: ${message}`, {
      tags: tags.invalidate,
      error: { stack_trace: stack },
    });
  }
};

/** Returns the target when Elasticsearch didn't find the key, e.g. a `refresh: false` grant. */
const invalidateEsNow = async (
  { security, logger }: ClientContext,
  apiKey: string,
  subject: string
): Promise<InvalidationTarget | undefined> => {
  const id = decodeApiKeyId(apiKey);
  if (!id) {
    return;
  }

  try {
    const result = await security.authc.apiKeys.invalidateAsInternalUser({ ids: [id] });
    if (result && result.error_count > 0) {
      logger.error(
        `Failed to synchronously invalidate ES API key for ${subject}: ${result.error_details
          ?.map((error) => error.reason)
          .join(', ')}`
      );
    }
    const notFound =
      result &&
      result.invalidated_api_keys.length === 0 &&
      result.previously_invalidated_api_keys.length === 0;
    return notFound ? { apiKeyId: id } : undefined;
  } catch (err) {
    const { message, stack } = errorDetails(err);
    logger.error(`Failed to synchronously invalidate ES API key for ${subject}: ${message}`, {
      error: { stack_trace: stack },
    });
  }
};

/**
 * Invalidates the stored keys right away instead of queueing them. ES keys are invalidated as the
 * internal user. Errors are logged, never thrown. Returns the keys Elasticsearch didn't find yet,
 * so the caller can queue them.
 */
export const invalidateNow = async (
  context: ClientContext,
  { apiKey, uiamApiKey, apiKeyCreatedByUser }: StoredApiKeys,
  { subject }: { subject: string }
): Promise<InvalidationTarget[]> => {
  if (apiKeyCreatedByUser) {
    return [];
  }

  const [, notFound] = await Promise.all([
    uiamApiKey ? invalidateUiamNow(context, uiamApiKey, subject) : undefined,
    apiKey ? invalidateEsNow(context, apiKey, subject) : undefined,
  ]);
  return notFound ? [notFound] : [];
};
