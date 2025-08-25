/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentTargetVersion } from '../../../common/types';

import { AgentPolicyInvalidError, FleetUnauthorizedError } from '../../errors';
import { appContextService, licenseService } from '..';
import { checkTargetVersionsValidity } from '../../../common/services/agent_utils';

export function validateRequiredVersions(
  name: string,
  requiredVersions?: AgentTargetVersion[] | null
): void {
  if (!requiredVersions) {
    return;
  }
  if (!appContextService.getExperimentalFeatures().enableAutomaticAgentUpgrades) {
    throw new AgentPolicyInvalidError(
      `Policy "${name}" failed validation: required_versions are not allowed when automatic upgrades feature is disabled`
    );
  }
  if (requiredVersions && !licenseService.isEnterprise()) {
    throw new FleetUnauthorizedError(
      'Agents auto upgrades feature requires at least Enterprise license'
    );
  }
  const error = checkTargetVersionsValidity(requiredVersions);
  if (error) {
    throw new AgentPolicyInvalidError(
      `Policy "${name}" failed required_versions validation: ${error}`
    );
  }
}
