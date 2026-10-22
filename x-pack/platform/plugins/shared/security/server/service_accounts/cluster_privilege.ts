/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';

/**
 * The cluster privilege service accounts are gated on. `manage_security` covers every service
 * account operation, reads included, because the accounts and the workloads they run are a
 * security administrator's concern.
 */
export type ServiceAccountClusterPrivilege = 'manage_security';

export interface EnsureClusterPrivilegeParams {
  request: KibanaRequest;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  logger: Logger;
  privilege: ServiceAccountClusterPrivilege;
  /** What the caller is attempting, as a verb phrase for the messages, e.g. `create a service account`. */
  action: string;
  /**
   * Called with the 403 before it is thrown. The one hook for auditing a refusal: an
   * authorization refusal is the only failure the service account audit events record, and this
   * is where it is told apart from every other 403 on the same path.
   */
  onRefused?: (error: Boom.Boom) => void;
}

/**
 * Rejects with a 403 unless the request holds the given cluster privilege. Elasticsearch answers
 * the check from the caller's effective permissions, so a privilege that implies it, such as `all`,
 * passes too.
 */
export const ensureClusterPrivilege = async ({
  request,
  checkPrivilegesWithRequest,
  logger,
  privilege,
  action,
  onRefused,
}: EnsureClusterPrivilegeParams): Promise<void> => {
  const { hasAllRequested } = await checkPrivilegesWithRequest(request).globally({
    elasticsearch: { cluster: [privilege], index: {} },
  });

  if (!hasAllRequested) {
    logger.warn(`Refused to ${action}: missing \`${privilege}\` cluster privilege`);
    const error = Boom.forbidden(`Cannot ${action}: missing \`${privilege}\` cluster privilege`);
    onRefused?.(error);
    throw error;
  }
};
