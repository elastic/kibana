/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import satisfies from 'semver/functions/satisfies';
import semverValid from 'semver/functions/valid';
import validRange from 'semver/ranges/valid';

import type { AgentPolicyAgentVersionCondition } from '../types';

/**
 * The integrations of an agent policy that an agent on `agentVersion` is too old to run. Pass
 * `packageName` to look at a single integration. A version or range that cannot be parsed is
 * ignored, since `satisfies` would reject the agent for something nobody can act on.
 */
export const getIncompatibleIntegrations = ({
  agentVersion,
  conditions,
  packageName,
}: {
  agentVersion?: string;
  conditions?: AgentPolicyAgentVersionCondition[] | null;
  packageName?: string;
}): AgentPolicyAgentVersionCondition[] => {
  if (!agentVersion || !semverValid(agentVersion) || !conditions) return [];
  return conditions.filter(
    ({ name, version_condition: versionCondition }) =>
      (packageName === undefined || name === packageName) &&
      !!validRange(versionCondition) &&
      !satisfies(agentVersion, versionCondition)
  );
};
