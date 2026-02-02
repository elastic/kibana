/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '../../../../../../../common';
import type { RegistryVarGroup } from '../../../../types';

import {
  cloudConnectorPolicyEffect,
  computePolicyEffects,
  registerPolicyEffectHandler,
} from './var_group_policy_effects';
import type { VarGroupSelection } from './var_group_helpers';

describe('var_group_policy_effects', () => {
  const createMockPackagePolicy = (
    overrides: Partial<NewPackagePolicy> = {}
  ): NewPackagePolicy => ({
    name: 'test-policy',
    namespace: 'default',
    description: '',
    enabled: true,
    policy_id: 'agent-policy-1',
    policy_ids: ['agent-policy-1'],
    inputs: [],
    ...overrides,
  });

  const createMockVarGroups = (): RegistryVarGroup[] => [
    {
      name: 'auth_method',
      title: 'Authentication Method',
      options: [
        {
          name: 'cloud_connector',
          title: 'Cloud Connector',
          vars: ['role_arn'],
          provider: 'aws',
        },
        {
          name: 'manual',
          title: 'Manual',
          vars: ['access_key', 'secret_key'],
        },
      ],
    },
  ];

  describe('cloudConnectorPolicyEffect', () => {
    it('should return supports_cloud_connector: true when cloud connector option is selected', () => {
      const packagePolicy = createMockPackagePolicy();
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

      const result = cloudConnectorPolicyEffect(packagePolicy, selections, varGroups);

      expect(result).toEqual({
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
      });
    });

    it('should return supports_cloud_connector: false when non-cloud-connector option is selected', () => {
      const packagePolicy = createMockPackagePolicy({ supports_cloud_connector: true });
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'manual' };

      const result = cloudConnectorPolicyEffect(packagePolicy, selections, varGroups);

      expect(result).toEqual({
        supports_cloud_connector: false,
        cloud_connector_id: undefined,
      });
    });

    it('should return null when cloud connector is already enabled and selected', () => {
      const packagePolicy = createMockPackagePolicy({
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
      });
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

      const result = cloudConnectorPolicyEffect(packagePolicy, selections, varGroups);

      expect(result).toBeNull();
    });

    it('should return null when cloud connector is already disabled and not selected', () => {
      const packagePolicy = createMockPackagePolicy({
        supports_cloud_connector: false,
        cloud_connector_id: undefined,
      });
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'manual' };

      const result = cloudConnectorPolicyEffect(packagePolicy, selections, varGroups);

      expect(result).toBeNull();
    });
  });

  describe('computePolicyEffects', () => {
    it('should return null when varGroups is undefined', () => {
      const packagePolicy = createMockPackagePolicy();
      const selections: VarGroupSelection = {};

      const result = computePolicyEffects(packagePolicy, selections, undefined);

      expect(result).toBeNull();
    });

    it('should return null when varGroups is empty', () => {
      const packagePolicy = createMockPackagePolicy();
      const selections: VarGroupSelection = {};

      const result = computePolicyEffects(packagePolicy, selections, []);

      expect(result).toBeNull();
    });

    it('should compute effects from cloud connector handler', () => {
      const packagePolicy = createMockPackagePolicy();
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

      const result = computePolicyEffects(packagePolicy, selections, varGroups);

      expect(result).toEqual({
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
      });
    });
  });

  describe('registerPolicyEffectHandler', () => {
    it('should allow registering custom handlers', () => {
      const customHandler = jest.fn().mockReturnValue({ custom_field: 'test' });

      registerPolicyEffectHandler(customHandler);

      const packagePolicy = createMockPackagePolicy();
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'manual' };

      const result = computePolicyEffects(packagePolicy, selections, varGroups);

      expect(customHandler).toHaveBeenCalledWith(packagePolicy, selections, varGroups);
      expect(result).toMatchObject({ custom_field: 'test' });
    });
  });
});
