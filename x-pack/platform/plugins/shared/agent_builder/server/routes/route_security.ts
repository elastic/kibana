/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import { apiPrivileges } from '../../common/features';

/**
 * Security configuration object for read-only access to Agent Builder APIs.
 */
export const AGENT_BUILDER_READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
};

/**
 * Security configuration object for write access to Agent Builder APIs.
 */
export const AGENT_BUILDER_WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeAgentBuilder] },
};

/**
 * Security configuration object for write access to agents.
 */
export const AGENTS_WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.manageAgents] },
};

/**
 * Security configuration object for write access to tools.
 */
export const TOOLS_WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.manageTools] },
};

/**
 * Security configuration object for write access to skills.
 */
export const SKILLS_WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.manageSkills] },
};

/**
 * Security configuration object for editing an agent's access control list.
 *
 * Either the agent's owner (already granted `manageAgents` to create/edit their own agents)
 * OR a holder of the `manageAgentAcls` sub-feature privilege may call the endpoint. The route
 * handler enforces the ownership/manageAcls split per individual agent.
 */
export const AGENTS_MANAGE_ACL_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [
      { anyRequired: [apiPrivileges.manageAgents, apiPrivileges.manageAgentAcls] },
    ],
  },
};
