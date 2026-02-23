/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import { apiPrivileges } from '../../common/features';

export const AGENT_BUILDER_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
};
export const MANAGE_AGENTS_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.manageAgents] },
};
export const MANAGE_TOOLS_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.manageTools] },
};
