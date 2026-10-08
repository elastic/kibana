/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import type { AuthenticatedUser } from '@kbn/core/server';
import { getAuthenticatedPrincipal } from '@kbn/core-security-common';

const getElasticsearchReason = (error: errors.ResponseError): string | undefined => {
  const { body } = error;
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return undefined;
  }
  const { error: details } = body;
  return typeof details === 'object' &&
    details !== null &&
    'reason' in details &&
    typeof details.reason === 'string'
    ? details.reason
    : undefined;
};

const getRefusal = (error: unknown): { statusCode: number; reason: string } | undefined => {
  if (error instanceof errors.ResponseError) {
    const { statusCode = 500 } = error;
    return { statusCode, reason: getElasticsearchReason(error) ?? 'the request was refused' };
  }
  // UIAM errors are Booms whose message already reads `[code/type] message`.
  if (Boom.isBoom(error)) {
    return { statusCode: error.output.statusCode, reason: error.message };
  }
  return undefined;
};

/**
 * Turns a refused API key grant for a service account into a 4xx that names the account, or
 * returns `undefined` so the original error propagates unchanged.
 */
export const toServiceAccountGrantError = (
  error: unknown,
  user: AuthenticatedUser | null
): Boom.Boom | undefined => {
  const principal = user ? getAuthenticatedPrincipal(user) : null;
  if (principal?.type !== 'service_account') {
    return undefined;
  }

  // Server errors and transport failures are outages, not refusals, so they keep their 5xx.
  const refusal = getRefusal(error);
  if (!refusal || refusal.statusCode < 400 || refusal.statusCode >= 500) {
    return undefined;
  }

  return new Boom.Boom(
    `Unable to grant an API key for service account [${principal.serviceAccountId}]: ${refusal.reason}`,
    { statusCode: refusal.statusCode }
  );
};
