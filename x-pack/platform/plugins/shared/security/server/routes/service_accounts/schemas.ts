/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountRoleLimits } from '../../../common/service_accounts';
import { getCreateServiceAccountParamsSchema } from '../../../common/service_accounts';
import {
  ES_SERVICE_ACCOUNT_ROLE_LIMITS,
  UIAM_SERVICE_ACCOUNT_ROLE_LIMITS,
} from '../../service_accounts';

const BACKEND_ROLE_LIMITS = [UIAM_SERVICE_ACCOUNT_ROLE_LIMITS, ES_SERVICE_ACCOUNT_ROLE_LIMITS];

/**
 * The role limits a create request is held to. The route is registered before Kibana knows which
 * backend will handle requests, so it takes the larger of the backends' limits and never refuses
 * what a backend would accept. The backend that handles the request then enforces its own.
 */
export const SERVICE_ACCOUNT_ROLE_LIMITS: ServiceAccountRoleLimits = {
  maxRoles: Math.max(...BACKEND_ROLE_LIMITS.map(({ maxRoles }) => maxRoles)),
  maxRoleNameLength: Math.max(
    ...BACKEND_ROLE_LIMITS.map(({ maxRoleNameLength }) => maxRoleNameLength)
  ),
};

/**
 * Cap on the size of a create request body, which holds a name bounded by
 * `SERVICE_ACCOUNT_NAME_MAX_LENGTH` plus a role list bounded by
 * {@link SERVICE_ACCOUNT_ROLE_LIMITS}. Those add up to about 1 MB, so a request within the
 * field-level bounds meets this limit, whose 413 carries no field-level message, only if its role
 * names need heavy JSON escaping.
 */
export const SERVICE_ACCOUNT_CREATE_MAX_BODY_BYTES = 2 * 1024 * 1024;

export const createServiceAccountBodySchema = getCreateServiceAccountParamsSchema(
  SERVICE_ACCOUNT_ROLE_LIMITS
)
  // Rejects unknown keys, so callers cannot supply `assumable_by` or `role_assignments` — Kibana
  // derives both itself.
  .strict();
