/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '..';
import { AgentPolicyInvalidError, FleetUnauthorizedError } from '../../errors';

import { licenseService } from '..';

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
      jest.spyOn(licenseService, 'isEnterprise').mockReturnValue(true);
    });
    afterEach(() => {
      jest.spyOn(licenseService, 'isEnterprise').mockClear();
    });

    it('should throw error if duplicate versions', () => {
      expect(() => {
        validateRequiredVersions('test policy', [
          { version: '9.0.0', percentage: 10 },
          { version: '9.0.0', percentage: 10 },
        ]);
      }).toThrow(
        new AgentPolicyInvalidError(
          `Policy "test policy" failed required_versions validation: duplicate versions not allowed`
        )
      );
    });

    it('should throw error if license is not at least Enterprise', () => {
      jest.spyOn(licenseService, 'isEnterprise').mockReturnValue(false);
      expect(() => {
        validateRequiredVersions('test policy', [
          { version: '9.0.0', percentage: 10 },
          { version: '9.0.0', percentage: 10 },
        ]);
      }).toThrow(
        new FleetUnauthorizedError(
          `Agents auto upgrades feature requires at least Enterprise license`
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
          `Policy "test policy" failed required_versions validation: invalid semver version 9.0.0invalid`
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
          `Policy "test policy" failed required_versions validation: sum of percentages cannot exceed 100`
        )
      );
    });

    it('should throw error if percentage is 0', () => {
      expect(() => {
        validateRequiredVersions('test policy', [
          { version: '9.0.0', percentage: 100 },
          { version: '9.1.0', percentage: 0 },
        ]);
      }).toThrow(
        new AgentPolicyInvalidError(
          `Policy "test policy" failed required_versions validation: percentage must be greater than 0`
        )
      );
    });

    it('should throw error if percentage is less than 1', () => {
      expect(() => {
        validateRequiredVersions('test policy', [
          { version: '9.0.0', percentage: 100 },
          { version: '9.1.0', percentage: 0.5 },
        ]);
      }).toThrow(
        new AgentPolicyInvalidError(
          `Policy "test policy" failed required_versions validation: percentage must be greater than 0`
        )
      );
    });

    it('should throw error if percentage is undefined', () => {
      expect(() => {
        validateRequiredVersions('test policy', [
          { version: '9.0.0', percentage: 100 },
          { version: '9.1.0', percentage: undefined as any },
        ]);
      }).toThrow(
        new AgentPolicyInvalidError(
          `Policy "test policy" failed required_versions validation: percentage is required`
        )
      );
    });

    it('should throw error if percentage property is missing', () => {
      expect(() => {
        validateRequiredVersions('test policy', [
          { version: '9.0.0', percentage: 100 },
          { version: '9.1.0' } as any,
        ]);
      }).toThrow(
        new AgentPolicyInvalidError(
          `Policy "test policy" failed required_versions validation: percentage is required`
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

    it('should not throw error if there is no change between required_versions and isAuthorized is false', () => {
      validateRequiredVersions(
        'test policy',
        [
          { version: '9.0.0', percentage: 90 },
          { version: '9.1.0', percentage: 10 },
        ],
        [
          { version: '9.0.0', percentage: 90 },
          { version: '9.1.0', percentage: 10 },
        ],
        false
      );
    });

    it('should throw error if required_versions changed and isAuthorized is false', () => {
      expect(() => {
        validateRequiredVersions(
          'test policy',
          [
            { version: '9.0.0', percentage: 80 },
            { version: '9.1.0', percentage: 20 },
          ],
          [
            { version: '9.0.0', percentage: 90 },
            { version: '9.1.0', percentage: 10 },
          ],
          false
        );
      }).toThrow(
        new FleetUnauthorizedError(`updating 'required_versions' requires Agents 'All' privilege`)
      );
    });

    it('should not throw error if required_versions changed and isAuthorized is true', () => {
      validateRequiredVersions(
        'test policy',
        [
          { version: '9.0.0', percentage: 80 },
          { version: '9.1.0', percentage: 20 },
        ],
        [
          { version: '9.0.0', percentage: 90 },
          { version: '9.1.0', percentage: 10 },
        ],
        true
      );
    });

    it('should not throw if required_versions changed and isAuthorized is undefined', () => {
      validateRequiredVersions(
        'test policy',
        [
          { version: '9.0.0', percentage: 80 },
          { version: '9.1.0', percentage: 20 },
        ],
        [
          { version: '9.0.0', percentage: 90 },
          { version: '9.1.0', percentage: 10 },
        ]
      );
    });
  });
});
