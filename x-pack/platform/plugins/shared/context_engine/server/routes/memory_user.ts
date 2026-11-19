/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { apiPrivileges } from '../../common/features';

/**
 * Security for memory routes that write. `manage_memory` is checked but not required, so the
 * handler can allow the caller's own memory without it.
 */
export const MEMORY_WRITE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [apiPrivileges.writeContextEngine],
    extendedPrivileges: [apiPrivileges.manageMemory],
  },
};

export const MANAGE_MEMORY_REQUIRED_MESSAGE = `Acting on the memory of another user requires the [${apiPrivileges.manageMemory}] privilege.`;

/** Whether the request may act on the memory of `userId`: its own always, another user's only with `manage_memory`. */
export const canActOnUserMemory = (
  request: KibanaRequest,
  userId: string,
  callerUserId: string | undefined
): boolean => userId === callerUserId || request.authzResult?.[apiPrivileges.manageMemory] === true;
