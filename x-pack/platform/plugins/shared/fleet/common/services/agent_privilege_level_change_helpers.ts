/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGte from 'semver/functions/gte';

import type { Agent, AgentPolicy } from '../types';

import { isRootPrivilegeRequired } from './package_helpers';
import { policyHasFleetServer } from './agent_policies_helpers';

export const MINIMUM_PRIVILEGE_LEVEL_CHANGE_AGENT_VERSION = '9.3.0';

export const isAgentPrivilegeLevelChangeSupported = (agent: Agent) => {
  return (
    !agent.agent?.version ||
    semverGte(agent.agent.version, MINIMUM_PRIVILEGE_LEVEL_CHANGE_AGENT_VERSION)
  );
};

export const isAgentEligibleForPrivilegeLevelChange = (agent: Agent, agentPolicy?: AgentPolicy) => {
  const hasFleetServer = agentPolicy && policyHasFleetServer(agentPolicy);
  return (
    isAgentPrivilegeLevelChangeSupported(agent) &&
    agent.local_metadata?.elastic?.agent?.unprivileged !== true &&
    !isRootPrivilegeRequired(agentPolicy?.package_policies || []) &&
    !hasFleetServer
  );
};
