/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountRoleLimits } from '../../common/service_accounts';

/**
 * How many roles Elasticsearch itself allows on a user-managed service account. Bounds both what
 * Kibana sends and what it is willing to read back, since an account written outside Kibana may
 * hold up to this many and must still read as "taken" rather than as unreadable.
 */
export const ES_SERVICE_ACCOUNT_MAX_ROLES = 1000;

/**
 * The longest role name Elasticsearch accepts on a user-managed service account, the
 * `NativeRealmValidationUtil.MAX_NAME_LENGTH` its create request and store validate against. Like
 * {@link ES_SERVICE_ACCOUNT_MAX_ROLES}, it bounds both what Kibana sends and what it reads back.
 */
export const ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH = 507;

export const ES_SERVICE_ACCOUNT_ROLE_LIMITS: ServiceAccountRoleLimits = {
  maxRoles: ES_SERVICE_ACCOUNT_MAX_ROLES,
  maxRoleNameLength: ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH,
};
