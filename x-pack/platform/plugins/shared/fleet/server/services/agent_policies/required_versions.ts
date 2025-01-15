/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverValid from 'semver/functions/valid';

import type { AgentTargetVersion } from '../../../common/types';

import { AgentPolicyInvalidError } from '../../errors';
import { appContextService } from '..';

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
  const versions = requiredVersions.map((v) => v.version);
  const uniqueVersions = new Set(versions);
  if (versions.length !== uniqueVersions.size) {
    throw new AgentPolicyInvalidError(
      `Policy "${name}" failed validation: duplicate versions not allowed in required_versions`
    );
  }
  versions.forEach((version) => {
    if (!semverValid(version)) {
      throw new AgentPolicyInvalidError(
        `Policy "${name}" failed validation: invalid semver version ${version} in required_versions`
      );
    }
  });
  const sumOfPercentages = requiredVersions.reduce((acc, v) => acc + v.percentage, 0);
  if (sumOfPercentages > 100) {
    throw new AgentPolicyInvalidError(
      `Policy "${name}" failed validation: sum of required_versions percentages cannot exceed 100`
    );
  }
}
