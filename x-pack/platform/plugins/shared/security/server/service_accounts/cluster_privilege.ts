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
 * The two cluster privileges service accounts are gated on. `manage_security` is the one gate on
 * every change to what a service account is or which workloads run as one. `read_security` is
 * enough to look at the directory, matching what Elasticsearch asks of its own read API.
 */
export type ServiceAccountClusterPrivilege = 'manage_security' | 'read_security';

export interface EnsureClusterPrivilegeParams {
  request: KibanaRequest;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  logger: Logger;
  privilege: ServiceAccountClusterPrivilege;
  /** What the caller is attempting, as a verb phrase for the messages, e.g. `create a service account`. */
  action: string;
}

/**
 * Rejects with a 403 unless the request holds the given cluster privilege. Elasticsearch answers
 * the check from the caller's effective permissions, so a `manage_security` holder passes a
 * `read_security` check without holding that name.
 */
export const ensureClusterPrivilege = async ({
  request,
  checkPrivilegesWithRequest,
  logger,
  privilege,
  action,
}: EnsureClusterPrivilegeParams): Promise<void> => {
  const { hasAllRequested } = await checkPrivilegesWithRequest(request).globally({
    elasticsearch: { cluster: [privilege], index: {} },
  });

  if (!hasAllRequested) {
    logger.warn(`Refused to ${action}: missing \`${privilege}\` cluster privilege`);
    throw Boom.forbidden(`Cannot ${action}: missing \`${privilege}\` cluster privilege`);
  }
};
