/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, CoreRequestHandlerContext } from '@kbn/core/server';

/**
 * Privilege constants for anonymization profile management.
 * These map to Kibana feature privileges.
 */
export const ANONYMIZATION_PRIVILEGES = {
  /** Read access to anonymization profiles. */
  READ: 'anonymization:read',
  /** Full management access (create, update, delete) to anonymization profiles. */
  MANAGE: 'anonymization:manage',
} as const;

/**
 * Checks whether the current user has the required privilege.
 * Returns true if authorized, false otherwise.
 */
export const checkPrivilege = async (
  coreContext: CoreRequestHandlerContext,
  privilege: string
): Promise<boolean> => {
  try {
    const authz = coreContext.security.authc.getCurrentUser();
    // For now, check if the user is authenticated.
    // TODO: Implement granular Kibana feature-level privilege checks
    // using core.security.authz.checkPrivilegesWithRequest when
    // the anonymization feature is registered with feature privileges.
    return authz !== null;
  } catch {
    return false;
  }
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
