/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGte from 'semver/functions/gte';

import type { Agent } from '../types';

export const MINIMUM_MIGRATE_AGENT_VERSION = '9.2.0';

export const isAgentMigrationSupported = (agent: Agent) => {
  return !agent.agent?.version || semverGte(agent.agent.version, MINIMUM_MIGRATE_AGENT_VERSION);
};
