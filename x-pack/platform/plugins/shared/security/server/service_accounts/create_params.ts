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
 * `limits` are the calling backend's own role limits, which the route cannot apply because it
 * does not know which backend will handle the request.
 *
 * Duplicate roles are dropped first, keeping first occurrences in order, so that the role cap
 * counts distinct roles. Elasticsearch would drop duplicates silently and UIAM has not said what
 * it does, so neither is relied on.
 *
 * Rejects with a 400, so the failure looks the same whichever entry point the caller used.
 */
export const parseCreateServiceAccountParams = (
  params: CreateServiceAccountParams,
  limits: ServiceAccountRoleLimits
): ParsedCreateServiceAccountParams => {
  const parsed = getCreateServiceAccountParamsSchema(limits).safeParse(dedupeRoles(params));

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
 * Only touches what is already an array: anything else is left for the schema to describe, so the
 * caller gets the validation message rather than a type error from here.
 */
const dedupeRoles = (params: CreateServiceAccountParams): CreateServiceAccountParams =>
  Array.isArray(params?.roles) ? { ...params, roles: Array.from(new Set(params.roles)) } : params;
