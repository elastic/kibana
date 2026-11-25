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
 * security administrator's concern. The one exception is `getWorkloadServiceAccountSummary`,
 * which names the account a workload runs as to users who may see the workload.
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

export type CheckClusterPrivilegeParams = Pick<
  EnsureClusterPrivilegeParams,
  'request' | 'checkPrivilegesWithRequest' | 'privilege'
>;

/**
 * Whether the request holds the given cluster privilege. Elasticsearch answers the check from the
 * caller's effective permissions, so a privilege that implies it, such as `all`, passes too. A
 * failed check propagates: it says nothing about what the caller may do.
 */
export const hasClusterPrivilege = async ({
  request,
  checkPrivilegesWithRequest,
  privilege,
}: CheckClusterPrivilegeParams): Promise<boolean> => {
  const { hasAllRequested } = await checkPrivilegesWithRequest(request).globally({
    elasticsearch: { cluster: [privilege], index: {} },
  });
  return hasAllRequested;
};

/**
 * Logs the refusal of an action for a missing cluster privilege, and returns the 403 to refuse it
 * with. For a caller that refuses without throwing; {@link ensureClusterPrivilege} throws it.
 */
export const clusterPrivilegeRefusal = ({
  logger,
  privilege,
  action,
}: Pick<EnsureClusterPrivilegeParams, 'logger' | 'privilege' | 'action'>): Boom.Boom => {
  logger.warn(`Refused to ${action}: missing \`${privilege}\` cluster privilege`);
  return Boom.forbidden(`Cannot ${action}: missing \`${privilege}\` cluster privilege`);
};

/**
 * Rejects with a 403 unless the request holds the given cluster privilege. See
 * {@link hasClusterPrivilege} for how the check is answered.
 */
export const ensureClusterPrivilege = async ({
  request,
  checkPrivilegesWithRequest,
  logger,
  privilege,
  action,
  onRefused,
}: EnsureClusterPrivilegeParams): Promise<void> => {
  if (!(await hasClusterPrivilege({ request, checkPrivilegesWithRequest, privilege }))) {
    const error = clusterPrivilegeRefusal({ logger, privilege, action });
    onRefused?.(error);
    throw error;
  }
};
