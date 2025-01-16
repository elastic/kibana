/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '..';
import { AgentPolicyInvalidError } from '../../errors';

import { validateRequiredVersions } from './required_versions';

describe('validateRequiredVersions', () => {
  it('should throw error if feature flag is disabled', () => {
    jest
      .spyOn(appContextService, 'getExperimentalFeatures')
      .mockReturnValue({ enableAutomaticAgentUpgrades: false } as any);

    expect(() => {
      validateRequiredVersions('test policy', [{ version: '9.0.0', percentage: 100 }]);
    }).toThrow(
      new AgentPolicyInvalidError(
        `Policy "test policy" failed validation: required_versions are not allowed when automatic upgrades feature is disabled`
      )
    );
  });

  describe('feature flag enabled', () => {
    beforeEach(() => {
      jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableAutomaticAgentUpgrades: true } as any);
    });

    it('should throw error if duplicate versions', () => {
      expect(() => {
        validateRequiredVersions('test policy', [
          { version: '9.0.0', percentage: 10 },
          { version: '9.0.0', percentage: 10 },
        ]);
      }).toThrow(
        new AgentPolicyInvalidError(
          `Policy "test policy" failed validation: duplicate versions not allowed in required_versions`
        )
      );
    });

    it('should throw error if has invalid semver version', () => {
      expect(() => {
        validateRequiredVersions('test policy', [
          { version: '9.0.0', percentage: 10 },
          { version: '9.0.0invalid', percentage: 10 },
        ]);
      }).toThrow(
        new AgentPolicyInvalidError(
          `Policy "test policy" failed validation: invalid semver version 9.0.0invalid in required_versions`
        )
      );
    });

    it('should throw error if sum of percentages exceeds 100', () => {
      expect(() => {
        validateRequiredVersions('test policy', [
          { version: '9.0.0', percentage: 100 },
          { version: '9.1.0', percentage: 10 },
        ]);
      }).toThrow(
        new AgentPolicyInvalidError(
          `Policy "test policy" failed validation: sum of required_versions percentages cannot exceed 100`
        )
      );
    });

    it('should not throw error if valid required_versions', () => {
      validateRequiredVersions('test policy', [
        { version: '9.0.0', percentage: 90 },
        { version: '9.1.0', percentage: 10 },
      ]);
    });

    it('should not throw error if required_versions undefined', () => {
      validateRequiredVersions('test policy');
    });
  });
});
