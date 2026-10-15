/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { CreateServiceAccountParams } from '@kbn/core-security-server';
import { z } from '@kbn/zod';

import type { ServiceAccountRoleLimits } from '../../common/service_accounts';
import {
  getCreateServiceAccountParamsSchema,
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  serviceAccountNameSchema,
} from '../../common/service_accounts';

/** UIAM caps `assumable_by` at 100 entries, and the current project always takes one of them. */
export const MAX_ASSUMABLE_BY_PLATFORM_SERVICE_ACCOUNTS = 99;

/**
 * Create parameters accepted from callers of the server contract. A superset of the route body:
 * `assumableByPlatformServiceAccounts` is never accepted over HTTP. Duplicate IDs are dropped,
 * keeping first occurrences in order.
 */
const getServerCreateServiceAccountParamsSchema = (limits: ServiceAccountRoleLimits) =>
  getCreateServiceAccountParamsSchema(limits).extend({
    assumableByPlatformServiceAccounts: z
      .preprocess(
        (ids) => (Array.isArray(ids) ? Array.from(new Set(ids)) : ids),
        z
          .array(z.string().min(1).max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH))
          .min(1)
          .max(MAX_ASSUMABLE_BY_PLATFORM_SERVICE_ACCOUNTS)
      )
      .optional(),
  });

/** Create parameters, once validated. */
export type ParsedCreateServiceAccountParams = ReturnType<
  ReturnType<typeof getServerCreateServiceAccountParamsSchema>['parse']
>;

/**
 * Validates create parameters inside a backend rather than trusting the route to have done it.
 * Callers of the server contract never pass through the route, and the name reaches an
 * Elasticsearch URL path from here.
 *
 * `limits` are the calling backend's own role limits. The schema drops duplicate roles before
 * counting them.
 *
 * Rejects with a 400, so the failure looks the same whichever entry point the caller used.
 */
export const parseCreateServiceAccountParams = (
  params: CreateServiceAccountParams,
  limits: ServiceAccountRoleLimits
): ParsedCreateServiceAccountParams => {
  const parsed = getServerCreateServiceAccountParamsSchema(limits).safeParse(params);

  if (!parsed.success) {
    throw Boom.badRequest(
      `Cannot create a service account: ${parsed.error.issues
        .map(({ path, message }) => `\`${path.join('.') || 'params'}\` ${message}`)
        .join('; ')}`
    );
  }

  return parsed.data;
};

/**
 * The name a refused create can safely name in its audit event, or `undefined` when there is none.
 * The Elasticsearch backend checks the caller's privilege before
 * {@link parseCreateServiceAccountParams} has vouched for anything, so the name is checked on its
 * own here rather than written to the log as received.
 */
export const auditableName = (params: CreateServiceAccountParams): { name: string } | undefined => {
  const parsed = serviceAccountNameSchema.safeParse(params.name);
  return parsed.success ? { name: parsed.data } : undefined;
};
