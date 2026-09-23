/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountRoleLimits } from '../../common/service_accounts';

/**
 * How many roles one UIAM service account may be given. UIAM allows 50 application roles per role
 * assignment, because the roles are encoded into every token it mints.
 */
export const UIAM_SERVICE_ACCOUNT_MAX_ROLES = 50;

/** The longest role name UIAM accepts, its bound for a role id. */
export const UIAM_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH = 507;

export const UIAM_SERVICE_ACCOUNT_ROLE_LIMITS: ServiceAccountRoleLimits = {
  maxRoles: UIAM_SERVICE_ACCOUNT_MAX_ROLES,
  maxRoleNameLength: UIAM_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH,
};
