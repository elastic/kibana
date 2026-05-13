/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '../../../../../../../common';
import type { RegistryVarGroup } from '../../../../types';

import {
  updateCloudConnectorPolicy,
  buildVarGroupPolicyUpdates,
  registerPolicyUpdateHandler,
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
      selector_title: 'Select authentication method',
      options: [
        {
          name: 'cloud_connector',
          title: 'Cloud Connector',
          vars: ['role_arn', 'external_id'],
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

  describe('updateCloudConnectorPolicy', () => {
    it('should return supports_cloud_connector: true when cloud connector option is selected', () => {
      const packagePolicy = createMockPackagePolicy();
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

      const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

      expect(result).toEqual({
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
      });
    });

    it('should return supports_cloud_connector: false when non-cloud-connector option is selected', () => {
      const packagePolicy = createMockPackagePolicy({ supports_cloud_connector: true });
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'manual' };

      const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

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

      const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

      expect(result).toBeNull();
    });

    it('should preserve cloud_connector_id when already set by CloudConnectorSetup', () => {
      const packagePolicy = createMockPackagePolicy({
        supports_cloud_connector: true,
        cloud_connector_id: 'existing-connector-id',
      });
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

      const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

      expect(result).toBeNull();
    });

    it('should preserve cloud_connector_id in edit flow with supports_cloud_connectors var set', () => {
      const packagePolicy = createMockPackagePolicy({
        supports_cloud_connector: true,
        cloud_connector_id: 'saved-connector-id',
        vars: {
          supports_cloud_connectors: { value: true, type: 'bool' },
        },
      });
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

      const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

      expect(result).toBeNull();
    });

    it('should return null when cloud connector is already disabled and not selected', () => {
      const packagePolicy = createMockPackagePolicy({
        supports_cloud_connector: false,
        cloud_connector_id: undefined,
      });
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'manual' };

      const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

      expect(result).toBeNull();
    });

    describe('supports_cloud_connectors var', () => {
      it('should set supports_cloud_connectors var to true when selecting cloud connector', () => {
        const packagePolicy = createMockPackagePolicy({
          vars: {
            role_arn: { value: '' },
            external_id: { value: '' },
            supports_cloud_connectors: { value: false, type: 'bool' },
          },
        });
        const varGroups = createMockVarGroups();
        const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

        const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

        expect(result?.vars?.supports_cloud_connectors).toEqual({ value: true, type: 'bool' });
        expect(result?.supports_cloud_connector).toBe(true);
      });

      it('should set supports_cloud_connectors var to false and clear secret vars when deselecting', () => {
        const packagePolicy = createMockPackagePolicy({
          supports_cloud_connector: true,
          vars: {
            role_arn: { value: 'some-arn' },
            external_id: { value: { isSecretRef: true, id: 'secret-1' }, type: 'password' },
            supports_cloud_connectors: { value: true, type: 'bool' },
          },
        });
        const varGroups = createMockVarGroups();
        const selections: VarGroupSelection = { auth_method: 'manual' };

        const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

        expect(result?.vars?.supports_cloud_connectors).toEqual({ value: false, type: 'bool' });
        expect(result?.vars?.external_id).toEqual({ value: '', type: 'password' });
        expect(result?.vars?.role_arn).toEqual({ value: 'some-arn' });
        expect(result?.supports_cloud_connector).toBe(false);
      });

      it('should preserve plain-text cloud connector vars and non-cloud-connector vars when deselecting', () => {
        const packagePolicy = createMockPackagePolicy({
          supports_cloud_connector: true,
          vars: {
            role_arn: { value: 'some-arn' },
            external_id: { value: 'plain-text-id' },
            supports_cloud_connectors: { value: true },
            unrelated_var: { value: 'keep-this' },
          },
        });
        const varGroups = createMockVarGroups();
        const selections: VarGroupSelection = { auth_method: 'manual' };

        const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

        expect(result?.vars?.role_arn).toEqual({ value: 'some-arn' });
        expect(result?.vars?.external_id).toEqual({ value: 'plain-text-id' });
        expect(result?.vars?.supports_cloud_connectors).toEqual({ value: false });
        expect(result?.vars?.unrelated_var).toEqual({ value: 'keep-this' });
      });

      it('should not include vars update when supports_cloud_connectors var does not exist', () => {
        const packagePolicy = createMockPackagePolicy({
          vars: {
            role_arn: { value: '' },
          },
        });
        const varGroups = createMockVarGroups();
        const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

        const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

        expect(result).toEqual({
          supports_cloud_connector: true,
          cloud_connector_id: undefined,
        });
        expect(result).not.toHaveProperty('vars');
      });

      it('should return null when var is already in desired state', () => {
        const packagePolicy = createMockPackagePolicy({
          supports_cloud_connector: true,
          cloud_connector_id: undefined,
          vars: {
            supports_cloud_connectors: { value: true },
          },
        });
        const varGroups = createMockVarGroups();
        const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

        const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

        expect(result).toBeNull();
      });

      it('should trigger update when root flag is correct but var is stale', () => {
        const packagePolicy = createMockPackagePolicy({
          supports_cloud_connector: false,
          cloud_connector_id: undefined,
          vars: {
            supports_cloud_connectors: { value: true },
          },
        });
        const varGroups = createMockVarGroups();
        const selections: VarGroupSelection = { auth_method: 'manual' };

        const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

        expect(result?.vars?.supports_cloud_connectors).toEqual({ value: false });
      });

      it('should only clear secret-ref vars, not plain-text cloud connector vars', () => {
        const packagePolicy = createMockPackagePolicy({
          supports_cloud_connector: true,
          vars: {
            role_arn: { value: 'arn:aws:iam::123456:role/MyRole' },
            external_id: { value: { isSecretRef: true, id: 'secret-abc' }, type: 'password' },
            supports_cloud_connectors: { value: true, type: 'bool' },
          },
        });
        const varGroups = createMockVarGroups();
        const selections: VarGroupSelection = { auth_method: 'manual' };

        const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

        expect(result?.vars?.role_arn).toEqual({ value: 'arn:aws:iam::123456:role/MyRole' });
        expect(result?.vars?.external_id).toEqual({ value: '', type: 'password' });
        expect(result?.vars?.supports_cloud_connectors).toEqual({ value: false, type: 'bool' });
      });

      it('should clear secret-ref vars in input stream vars when deselecting', () => {
        const packagePolicy = createMockPackagePolicy({
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'aws-test',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'test' },
                  vars: {
                    role_arn: { value: 'arn:aws:iam::123456:role/MyRole' },
                    external_id: {
                      value: { isSecretRef: true, id: 'secret-xyz' },
                      type: 'password',
                    },
                    some_other_var: { value: 'keep' },
                  },
                },
              ],
            },
          ],
        });
        const varGroups = createMockVarGroups();
        const selections: VarGroupSelection = { auth_method: 'manual' };

        const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

        const streamVars = result?.inputs?.[0]?.streams[0]?.vars;
        expect(streamVars?.role_arn).toEqual({ value: 'arn:aws:iam::123456:role/MyRole' });
        expect(streamVars?.external_id).toEqual({ value: '', type: 'password' });
        expect(streamVars?.some_other_var).toEqual({ value: 'keep' });
      });

      it('should not return inputs when no cloud connector vars exist in streams', () => {
        const packagePolicy = createMockPackagePolicy({
          supports_cloud_connector: true,
          inputs: [
            {
              type: 'aws-test',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'test' },
                  vars: {
                    unrelated_var: { value: 'keep' },
                  },
                },
              ],
            },
          ],
        });
        const varGroups = createMockVarGroups();
        const selections: VarGroupSelection = { auth_method: 'manual' };

        const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

        expect(result).not.toHaveProperty('inputs');
      });

      it('should update stale var without clearing cloud_connector_id', () => {
        const packagePolicy = createMockPackagePolicy({
          supports_cloud_connector: true,
          cloud_connector_id: 'existing-connector-id',
          vars: {
            supports_cloud_connectors: { value: false, type: 'bool' },
          },
        });
        const varGroups = createMockVarGroups();
        const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

        const result = updateCloudConnectorPolicy(packagePolicy, selections, varGroups);

        expect(result).toEqual({
          supports_cloud_connector: true,
          vars: expect.objectContaining({
            supports_cloud_connectors: { value: true, type: 'bool' },
          }),
        });
        expect(result).not.toHaveProperty('cloud_connector_id');
      });
    });
  });

  describe('buildVarGroupPolicyUpdates', () => {
    it('should return null when varGroups is undefined', () => {
      const packagePolicy = createMockPackagePolicy();
      const selections: VarGroupSelection = {};

      const result = buildVarGroupPolicyUpdates(packagePolicy, selections, undefined);

      expect(result).toBeNull();
    });

    it('should return null when varGroups is empty', () => {
      const packagePolicy = createMockPackagePolicy();
      const selections: VarGroupSelection = {};

      const result = buildVarGroupPolicyUpdates(packagePolicy, selections, []);

      expect(result).toBeNull();
    });

    it('should compute effects from cloud connector handler', () => {
      const packagePolicy = createMockPackagePolicy();
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };

      const result = buildVarGroupPolicyUpdates(packagePolicy, selections, varGroups);

      expect(result).toEqual({
        supports_cloud_connector: true,
        cloud_connector_id: undefined,
      });
    });
  });

  describe('registerPolicyUpdateHandler', () => {
    it('should allow registering custom handlers', () => {
      const customHandler = jest.fn().mockReturnValue({ custom_field: 'test' });

      registerPolicyUpdateHandler(customHandler);

      const packagePolicy = createMockPackagePolicy();
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'manual' };

      const result = buildVarGroupPolicyUpdates(packagePolicy, selections, varGroups);

      expect(customHandler).toHaveBeenCalledWith(packagePolicy, selections, varGroups);
      expect(result).toMatchObject({ custom_field: 'test' });
    });
  });
});
