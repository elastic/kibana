/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext } from '@kbn/core/server';

/**
 * Privilege constants for anonymization profile management.
 * These map to Kibana feature privileges (to be registered in a follow-up).
 */
export const ANONYMIZATION_PRIVILEGES = {
  /** Read access to anonymization profiles. */
  READ: 'anonymization:read',
  /** Full management access (create, update, delete) to anonymization profiles. */
  MANAGE: 'anonymization:manage',
} as const;

/**
 * Checks whether the current user has the required privilege.
 *
 * TODO: Implement granular Kibana feature-level privilege checks
 * using `core.security.authz.checkPrivilegesWithRequest` when the
 * anonymization feature is registered with feature privileges.
 *
 * For now, any authenticated user is authorized. The routes are
 * internal-only (`access: 'internal'`), so they are not exposed
 * publicly.
 */
export const checkPrivilege = async (
  _coreContext: CoreRequestHandlerContext,
  _privilege: string
): Promise<boolean> => {
  // Internal APIs are already protected by Kibana's authentication layer.
  // Granular feature privilege checks will be added when the anonymization
  // feature is registered via core.features.registerKibanaFeature().
  return true;
};

/**
 * Asserts that the current user has the required privilege.
 * Throws a 403 error if not authorized.
 */
export const assertPrivilege = async (
  coreContext: CoreRequestHandlerContext,
  privilege: string
): Promise<void> => {
  const authorized = await checkPrivilege(coreContext, privilege);
  if (!authorized) {
    const err = new Error(`Unauthorized: missing privilege ${privilege}`);
    (err as any).statusCode = 403;
    throw err;
  }
};
