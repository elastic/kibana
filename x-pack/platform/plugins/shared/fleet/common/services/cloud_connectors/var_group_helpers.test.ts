/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryVarGroup } from '../../types/models/package_spec';

import {
  getSelectedOption,
  getCloudConnectorOption,
  getCloudConnectorVars,
  getIacTemplateUrlFromVarGroupSelection,
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
});
