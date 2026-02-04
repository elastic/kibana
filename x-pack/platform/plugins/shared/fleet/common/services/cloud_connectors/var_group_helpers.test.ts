/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy } from '../../types';
import type { RegistryVarGroup } from '../../types/models/package_spec';

import {
  getSelectedOption,
  getCloudConnectorOption,
  getCloudConnectorVars,
  getIacTemplateUrlFromVarGroupSelection,
  detectTargetCsp,
  type VarGroupSelection,
} from './var_group_helpers';

describe('var_group_helpers (cloud connector)', () => {
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
          iac_template_url: 'https://example.com/cloudformation.yaml',
        },
        {
          name: 'manual',
          title: 'Manual',
          vars: ['access_key', 'secret_key'],
        },
      ],
    },
  ];

  const createMultipleVarGroups = (): RegistryVarGroup[] => [
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
    {
      name: 'region',
      title: 'Region',
      selector_title: 'Select region',
      options: [
        {
          name: 'us_east',
          title: 'US East',
          vars: ['region_us_east_var'],
        },
        {
          name: 'eu_west',
          title: 'EU West',
          vars: ['region_eu_west_var'],
        },
      ],
    },
  ];

  describe('getSelectedOption', () => {
    it('should return undefined when selectedOptionName is undefined', () => {
      const varGroup = createMockVarGroups()[0];
      const result = getSelectedOption(varGroup, undefined);
      expect(result).toBeUndefined();
    });

    it('should return the selected option when found', () => {
      const varGroup = createMockVarGroups()[0];
      const result = getSelectedOption(varGroup, 'cloud_connector');
      expect(result?.name).toBe('cloud_connector');
      expect(result?.provider).toBe('aws');
    });

    it('should return undefined when option name does not exist', () => {
      const varGroup = createMockVarGroups()[0];
      const result = getSelectedOption(varGroup, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getCloudConnectorOption', () => {
    it('should return isCloudConnector: false when varGroups is undefined', () => {
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
      const result = getCloudConnectorOption(undefined, selections);
      expect(result).toEqual({ isCloudConnector: false });
    });

    it('should return isCloudConnector: false when varGroups is empty', () => {
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
      const result = getCloudConnectorOption([], selections);
      expect(result).toEqual({ isCloudConnector: false });
    });

    it('should return isCloudConnector: false when no selection is made', () => {
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = {};
      const result = getCloudConnectorOption(varGroups, selections);
      expect(result).toEqual({ isCloudConnector: false });
    });

    it('should return isCloudConnector: true with provider when cloud connector is selected', () => {
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
      const result = getCloudConnectorOption(varGroups, selections);
      expect(result).toEqual({
        isCloudConnector: true,
        provider: 'aws',
      });
    });

    it('should return isCloudConnector: false when non-cloud-connector option is selected', () => {
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'manual' };
      const result = getCloudConnectorOption(varGroups, selections);
      expect(result).toEqual({ isCloudConnector: false });
    });
  });

  describe('getCloudConnectorVars', () => {
    it('should return empty set when varGroups is undefined', () => {
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
      const result = getCloudConnectorVars(undefined, selections);
      expect(result).toEqual(new Set());
    });

    it('should return empty set when varGroups is empty', () => {
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
      const result = getCloudConnectorVars([], selections);
      expect(result).toEqual(new Set());
    });

    it('should return empty set when no selection is made', () => {
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = {};
      const result = getCloudConnectorVars(varGroups, selections);
      expect(result).toEqual(new Set());
    });

    it('should return empty set when non-cloud-connector option is selected', () => {
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'manual' };
      const result = getCloudConnectorVars(varGroups, selections);
      expect(result).toEqual(new Set());
    });

    it('should return vars for cloud connector option when selected', () => {
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
      const result = getCloudConnectorVars(varGroups, selections);
      expect(result).toEqual(new Set(['role_arn', 'external_id']));
    });

    it('should only return vars from cloud connector option, not other var_groups', () => {
      const varGroups = createMultipleVarGroups();
      const selections: VarGroupSelection = {
        auth_method: 'cloud_connector',
        region: 'us_east',
      };
      const result = getCloudConnectorVars(varGroups, selections);
      // Should only include cloud connector vars, not region vars
      expect(result).toEqual(new Set(['role_arn', 'external_id']));
      expect(result.has('region_us_east_var')).toBe(false);
    });

    it('should return empty set when selection does not match any option', () => {
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'nonexistent' };
      const result = getCloudConnectorVars(varGroups, selections);
      expect(result).toEqual(new Set());
    });
  });

  describe('getIacTemplateUrlFromVarGroupSelection', () => {
    it('should return undefined when varGroups is undefined', () => {
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
      const result = getIacTemplateUrlFromVarGroupSelection(undefined, selections);
      expect(result).toBeUndefined();
    });

    it('should return undefined when varGroups is empty', () => {
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
      const result = getIacTemplateUrlFromVarGroupSelection([], selections);
      expect(result).toBeUndefined();
    });

    it('should return undefined when no selection is made', () => {
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = {};
      const result = getIacTemplateUrlFromVarGroupSelection(varGroups, selections);
      expect(result).toBeUndefined();
    });

    it('should return iac_template_url when cloud connector option is selected', () => {
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'cloud_connector' };
      const result = getIacTemplateUrlFromVarGroupSelection(varGroups, selections);
      expect(result).toBe('https://example.com/cloudformation.yaml');
    });

    it('should return undefined when selected option has no iac_template_url', () => {
      const varGroups = createMockVarGroups();
      const selections: VarGroupSelection = { auth_method: 'manual' };
      const result = getIacTemplateUrlFromVarGroupSelection(varGroups, selections);
      expect(result).toBeUndefined();
    });
  });

  describe('detectTargetCsp', () => {
    const createMockPackagePolicy = (overrides: Partial<NewPackagePolicy> = {}): NewPackagePolicy =>
      ({
        name: 'test-policy',
        namespace: 'default',
        description: '',
        enabled: true,
        inputs: [],
        policy_ids: [],
        ...overrides,
      } as NewPackagePolicy);

    it('should return provider from var_group selection when cloud connector is selected', () => {
      const varGroups = createMockVarGroups();
      const packagePolicy = createMockPackagePolicy({
        var_group_selections: { auth_method: 'cloud_connector' },
      });
      const result = detectTargetCsp(packagePolicy, varGroups);
      expect(result).toBe('aws');
    });

    it('should return undefined when non-cloud-connector option is selected', () => {
      const varGroups = createMockVarGroups();
      const packagePolicy = createMockPackagePolicy({
        var_group_selections: { auth_method: 'manual' },
      });
      const result = detectTargetCsp(packagePolicy, varGroups);
      expect(result).toBeUndefined();
    });

    it('should return undefined when no var_group_selections', () => {
      const varGroups = createMockVarGroups();
      const packagePolicy = createMockPackagePolicy();
      const result = detectTargetCsp(packagePolicy, varGroups);
      expect(result).toBeUndefined();
    });

    it('should fallback to input type detection when no var_groups', () => {
      const packagePolicy = createMockPackagePolicy({
        inputs: [{ type: 'aws-cloudwatch', enabled: true }] as NewPackagePolicy['inputs'],
      });
      const result = detectTargetCsp(packagePolicy, undefined);
      expect(result).toBe('aws');
    });

    it('should fallback to input type detection for azure', () => {
      const packagePolicy = createMockPackagePolicy({
        inputs: [{ type: 'azure-logs', enabled: true }] as NewPackagePolicy['inputs'],
      });
      const result = detectTargetCsp(packagePolicy, undefined);
      expect(result).toBe('azure');
    });

    it('should fallback to input type detection for gcp', () => {
      const packagePolicy = createMockPackagePolicy({
        inputs: [{ type: 'gcp-pubsub', enabled: true }] as NewPackagePolicy['inputs'],
      });
      const result = detectTargetCsp(packagePolicy, undefined);
      expect(result).toBe('gcp');
    });

    it('should return undefined when input type does not match any provider', () => {
      const packagePolicy = createMockPackagePolicy({
        inputs: [{ type: 'logfile', enabled: true }] as NewPackagePolicy['inputs'],
      });
      const result = detectTargetCsp(packagePolicy, undefined);
      expect(result).toBeUndefined();
    });

    it('should prioritize var_group detection over input type detection', () => {
      const varGroups = createMockVarGroups();
      const packagePolicy = createMockPackagePolicy({
        var_group_selections: { auth_method: 'cloud_connector' },
        inputs: [{ type: 'azure-logs', enabled: true }] as NewPackagePolicy['inputs'],
      });
      // var_group has aws provider, input has azure - should return aws from var_group
      const result = detectTargetCsp(packagePolicy, varGroups);
      expect(result).toBe('aws');
    });
  });
});
