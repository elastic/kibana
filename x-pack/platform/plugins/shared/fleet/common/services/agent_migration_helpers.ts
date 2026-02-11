/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGte from 'semver/functions/gte';

import type { Agent, AgentPolicy } from '../types';

import { policyHasFleetServer } from './agent_policies_helpers';

export const MINIMUM_MIGRATE_AGENT_VERSION = '9.2.0';

export const isAgentMigrationSupported = (agent: Agent) => {
  // Check if agent meets minimum version requirement
  const meetsVersionRequirement =
    !agent.agent?.version || semverGte(agent.agent.version, MINIMUM_MIGRATE_AGENT_VERSION);

  // Check if agent is not containerized (containerized agents have upgradeable: false)
  const isNotContainerized = agent.local_metadata?.elastic?.agent?.upgradeable !== false;

  return meetsVersionRequirement && isNotContainerized;
};

export const isAgentEligibleForMigration = (agent: Agent, agentPolicy?: AgentPolicy) => {
  const hasFleetServer = agentPolicy && policyHasFleetServer(agentPolicy);
  return isAgentMigrationSupported(agent) && !agentPolicy?.is_protected && !hasFleetServer;
};
