/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';

export interface EnsureManageSecurityPrivilegeParams {
  request: KibanaRequest;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  logger: Logger;
  /** What the caller is attempting, as a verb phrase for the messages, e.g. `create a service account`. */
  action: string;
}

/**
 * Rejects with a 403 unless the request holds the `manage_security` cluster privilege, the one
 * gate on every change to what a service account is or which workloads run as one.
 */
export const ensureManageSecurityPrivilege = async ({
  request,
  checkPrivilegesWithRequest,
  logger,
  action,
}: EnsureManageSecurityPrivilegeParams): Promise<void> => {
  const { hasAllRequested } = await checkPrivilegesWithRequest(request).globally({
    elasticsearch: { cluster: ['manage_security'], index: {} },
  });

  if (!hasAllRequested) {
    logger.warn(`Refused to ${action}: missing \`manage_security\` cluster privilege`);
    throw Boom.forbidden(`Cannot ${action}: missing \`manage_security\` cluster privilege`);
  }
};
