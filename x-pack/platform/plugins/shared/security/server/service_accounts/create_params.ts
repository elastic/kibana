/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { CreateServiceAccountParams } from '@kbn/core-security-server';

import type { ServiceAccountRoleLimits } from '../../common/service_accounts';
import { getCreateServiceAccountParamsSchema } from '../../common/service_accounts';

/** Create parameters, once validated: the same shape the route accepts. */
export type ParsedCreateServiceAccountParams = ReturnType<
  ReturnType<typeof getCreateServiceAccountParamsSchema>['parse']
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
  const parsed = getCreateServiceAccountParamsSchema(limits).safeParse(params);

  if (!parsed.success) {
    throw Boom.badRequest(
      `Cannot create a service account: ${parsed.error.issues
        .map(({ path, message }) => `\`${path.join('.') || 'params'}\` ${message}`)
        .join('; ')}`
    );
  }

  return parsed.data;
};
