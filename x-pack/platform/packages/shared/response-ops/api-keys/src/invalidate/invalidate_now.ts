/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUiamCredential } from '@kbn/core-security-server';
import type { ClientContext } from '../create/types';
import { invalidateUiamApiKey } from '../create/grant';
import { errorDetails } from '../errors';
import type { ApiKeys, EsApiKey, UiamApiKey } from '../store/api_keys';
import { buildFakeRequest } from '../use/fake_request';
import type { InvalidationTarget } from './targets';

const invalidateUiamNow = async (
  context: ClientContext,
  { id, secret }: UiamApiKey,
  subject: string
): Promise<InvalidationTarget | undefined> => {
  const { logger, tags } = context;
  if (!id || !isUiamCredential(secret)) {
    logger.error(
      `Failed to synchronously invalidate UIAM API key for ${subject}: stored credential is not a UIAM API key`,
      { tags: tags.invalidate }
    );
    return;
  }

  const target = { apiKeyId: id, uiamApiKey: secret };
  try {
    // `uiam.invalidate` authenticates with the key being revoked, whoever the caller is.
    const invalidated = await invalidateUiamApiKey(context, buildFakeRequest(secret), subject, id);
    return invalidated ? undefined : target;
  } catch (err) {
    const { message, stack } = errorDetails(err);
    logger.error(`Failed to synchronously invalidate UIAM API key for ${subject}: ${message}`, {
      tags: tags.invalidate,
      error: { stack_trace: stack },
    });
    return target;
  }
};

const invalidateEsNow = async (
  { security, logger }: ClientContext,
  { id }: EsApiKey,
  subject: string
): Promise<InvalidationTarget | undefined> => {
  if (!id) {
    return;
  }

  const target = { apiKeyId: id };
  try {
    const result = await security.authc.apiKeys.invalidateAsInternalUser({ ids: [id] });
    if (!result) {
      return;
    }
    if (result.error_count > 0) {
      logger.error(
        `Failed to synchronously invalidate ES API key for ${subject}: ${result.error_details
          ?.map((error) => error.reason)
          .join(', ')}`
      );
      return target;
    }
    // A `refresh: false` grant can be missing from Elasticsearch search results for a while.
    const notFound =
      result.invalidated_api_keys.length === 0 &&
      result.previously_invalidated_api_keys.length === 0;
    return notFound ? target : undefined;
  } catch (err) {
    const { message, stack } = errorDetails(err);
    logger.error(`Failed to synchronously invalidate ES API key for ${subject}: ${message}`, {
      error: { stack_trace: stack },
    });
    return target;
  }
};

/**
 * Invalidates Kibana-owned keys right away instead of queueing them. ES keys are invalidated as
 * the internal user. Errors are logged, never thrown. Returns the keys that couldn't be
 * invalidated yet, so the caller can queue them.
 */
export const invalidateNow = async (
  context: ClientContext,
  keys: ApiKeys | undefined,
  { subject }: { subject: string }
): Promise<InvalidationTarget[]> => {
  if (!keys || keys.createdByUser) {
    return [];
  }

  const results = await Promise.all([
    keys.uiam ? invalidateUiamNow(context, keys.uiam, subject) : undefined,
    keys.es ? invalidateEsNow(context, keys.es, subject) : undefined,
  ]);
  return results.filter((target): target is InvalidationTarget => target !== undefined);
};
