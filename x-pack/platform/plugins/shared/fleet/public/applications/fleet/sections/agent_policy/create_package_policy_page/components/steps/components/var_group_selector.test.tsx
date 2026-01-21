/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';

import type { RegistryVarGroup } from '../../../../../../types';

import {
  VarGroupSelector,
  getVisibleOptions,
  getVisibleVarsForOption,
  getVarsControlledByVarGroups,
  shouldShowVar,
  computeDefaultVarGroupSelections,
  isVarRequiredByVarGroup,
  isCloudConnectorOption,
  getCloudProviderFromOption,
  getCloudProviderFromVarGroupSelection,
  isCloudConnectorSelectedInVarGroups,
} from './var_group_selector';

const mockVarGroup: RegistryVarGroup = {
  name: 'credential_type',
  title: 'Setup Access',
  selector_title: 'Preferred method',
  description: 'Select how you want to authenticate.',
  options: [
    {
      name: 'direct_access_key',
      title: 'Direct Access Keys',
      description: 'Use access key ID and secret access key.',
      vars: ['access_key_id', 'secret_access_key'],
    },
    {
      name: 'temporary_access_key',
      title: 'Temporary Access Keys',
      vars: ['access_key_id', 'secret_access_key', 'session_token'],
    },
    {
      name: 'cloud_connectors',
      title: 'Cloud Connector',
      vars: ['role_arn', 'external_id'],
      hide_in_deployment_modes: ['default'],
    },
    {
      name: 'assume_role',
      title: 'Assume Role',
      vars: ['role_arn'],
      hide_in_deployment_modes: ['agentless'],
    },
  ],
};

describe('VarGroupSelector', () => {
  describe('getVisibleOptions', () => {
    it('should return all options when no deployment mode filtering applies', () => {
      const varGroup: RegistryVarGroup = {
        name: 'test',
        title: 'Test',
        selector_title: 'Select',
        options: [
          { name: 'opt1', title: 'Option 1', vars: ['var1'] },
          { name: 'opt2', title: 'Option 2', vars: ['var2'] },
        ],
      };

      const visible = getVisibleOptions(varGroup, false);
      expect(visible).toHaveLength(2);
      expect(visible.map((o) => o.name)).toEqual(['opt1', 'opt2']);
    });

    it('should filter out options hidden in default deployment mode', () => {
      const visible = getVisibleOptions(mockVarGroup, false);
      expect(visible.map((o) => o.name)).toEqual([
        'direct_access_key',
        'temporary_access_key',
        'assume_role',
      ]);
      expect(visible.find((o) => o.name === 'cloud_connectors')).toBeUndefined();
    });

    it('should filter out options hidden in agentless deployment mode', () => {
      const visible = getVisibleOptions(mockVarGroup, true);
      expect(visible.map((o) => o.name)).toEqual([
        'direct_access_key',
        'temporary_access_key',
        'cloud_connectors',
      ]);
      expect(visible.find((o) => o.name === 'assume_role')).toBeUndefined();
    });

    it('should filter out options via hide_in_var_group_options', () => {
      const hideInVarGroupOptions = { credential_type: ['direct_access_key'] };
      const visible = getVisibleOptions(mockVarGroup, false, hideInVarGroupOptions);
      expect(visible.find((o) => o.name === 'direct_access_key')).toBeUndefined();
    });
  });

  describe('getVisibleVarsForOption', () => {
    it('should return vars for the selected option', () => {
      const vars = getVisibleVarsForOption(mockVarGroup, 'direct_access_key');
      expect(vars).toEqual(['access_key_id', 'secret_access_key']);
    });

    it('should return undefined for unknown option', () => {
      const vars = getVisibleVarsForOption(mockVarGroup, 'unknown');
      expect(vars).toBeUndefined();
    });

    it('should return undefined when no option is selected', () => {
      const vars = getVisibleVarsForOption(mockVarGroup, undefined);
      expect(vars).toBeUndefined();
    });
  });

  describe('getVarsControlledByVarGroups', () => {
    it('should collect all vars from all options in all groups', () => {
      const controlled = getVarsControlledByVarGroups([mockVarGroup]);
      expect(controlled).toContain('access_key_id');
      expect(controlled).toContain('secret_access_key');
      expect(controlled).toContain('session_token');
      expect(controlled).toContain('role_arn');
      expect(controlled).toContain('external_id');
    });

    it('should return empty set for empty var_groups', () => {
      const controlled = getVarsControlledByVarGroups([]);
      expect(controlled.size).toBe(0);
    });
  });

  describe('shouldShowVar', () => {
    const varGroups = [mockVarGroup];

    it('should show var not controlled by any var_group', () => {
      const selections = { credential_type: 'direct_access_key' };
      expect(shouldShowVar('proxy_url', varGroups, selections)).toBe(true);
    });

    it('should show var when its option is selected', () => {
      const selections = { credential_type: 'direct_access_key' };
      expect(shouldShowVar('access_key_id', varGroups, selections)).toBe(true);
      expect(shouldShowVar('secret_access_key', varGroups, selections)).toBe(true);
    });

    it('should hide var when its option is not selected', () => {
      const selections = { credential_type: 'direct_access_key' };
      expect(shouldShowVar('session_token', varGroups, selections)).toBe(false);
      expect(shouldShowVar('role_arn', varGroups, selections)).toBe(false);
    });

    it('should show role_arn when assume_role is selected', () => {
      const selections = { credential_type: 'assume_role' };
      expect(shouldShowVar('role_arn', varGroups, selections)).toBe(true);
    });
  });

  describe('computeDefaultVarGroupSelections', () => {
    it('should return first visible option for each var_group', () => {
      const defaults = computeDefaultVarGroupSelections([mockVarGroup], false);
      expect(defaults).toEqual({ credential_type: 'direct_access_key' });
    });

    it('should return empty object when varGroups is undefined', () => {
      const defaults = computeDefaultVarGroupSelections(undefined, false);
      expect(defaults).toEqual({});
    });

    it('should return empty object when varGroups is empty', () => {
      const defaults = computeDefaultVarGroupSelections([], false);
      expect(defaults).toEqual({});
    });

    it('should select first visible option based on deployment mode (default)', () => {
      // In default mode, cloud_connectors is hidden, so first option is direct_access_key
      const defaults = computeDefaultVarGroupSelections([mockVarGroup], false);
      expect(defaults.credential_type).toBe('direct_access_key');
    });

    it('should select first visible option based on deployment mode (agentless)', () => {
      // In agentless mode, assume_role is hidden, so first option is still direct_access_key
      const defaults = computeDefaultVarGroupSelections([mockVarGroup], true);
      expect(defaults.credential_type).toBe('direct_access_key');
    });

    it('should handle multiple var_groups', () => {
      const multipleGroups: RegistryVarGroup[] = [
        {
          name: 'auth_type',
          title: 'Auth',
          selector_title: 'Select',
          options: [
            { name: 'api_key', title: 'API Key', vars: ['api_key'] },
            { name: 'oauth', title: 'OAuth', vars: ['client_id'] },
          ],
        },
        {
          name: 'connection_type',
          title: 'Connection',
          selector_title: 'Select',
          options: [
            { name: 'direct', title: 'Direct', vars: ['host'] },
            { name: 'proxy', title: 'Proxy', vars: ['proxy_url'] },
          ],
        },
      ];

      const defaults = computeDefaultVarGroupSelections(multipleGroups, false);
      expect(defaults).toEqual({
        auth_type: 'api_key',
        connection_type: 'direct',
      });
    });

    it('should skip var_groups with no visible options', () => {
      const groupWithAllHidden: RegistryVarGroup = {
        name: 'hidden_group',
        title: 'Hidden',
        selector_title: 'Select',
        options: [
          {
            name: 'opt1',
            title: 'Option 1',
            vars: ['var1'],
            hide_in_deployment_modes: ['default'],
          },
          {
            name: 'opt2',
            title: 'Option 2',
            vars: ['var2'],
            hide_in_deployment_modes: ['default'],
          },
        ],
      };

      // In default mode, all options are hidden
      const defaults = computeDefaultVarGroupSelections([groupWithAllHidden], false);
      expect(defaults).toEqual({});
    });

    it('should respect hideInVarGroupOptions parameter', () => {
      const hideInVarGroupOptions = { credential_type: ['direct_access_key'] };
      const defaults = computeDefaultVarGroupSelections(
        [mockVarGroup],
        false,
        hideInVarGroupOptions
      );
      // direct_access_key is hidden, so next visible option is temporary_access_key
      expect(defaults.credential_type).toBe('temporary_access_key');
    });
  });

  describe('VarGroupSelector component', () => {
    const defaultProps = {
      varGroup: mockVarGroup,
      selectedOptionName: 'direct_access_key',
      onSelectionChange: jest.fn(),
      isAgentlessEnabled: false,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render the selector with title and options', () => {
      render(<VarGroupSelector {...defaultProps} />);

      expect(screen.getByText('Setup Access')).toBeInTheDocument();
      expect(screen.getByText('Preferred method')).toBeInTheDocument();
    });

    it('should render group description', () => {
      render(<VarGroupSelector {...defaultProps} />);

      expect(screen.getByText('Select how you want to authenticate.')).toBeInTheDocument();
    });

    it('should call onSelectionChange when option is selected', () => {
      render(<VarGroupSelector {...defaultProps} />);

      const select = screen.getByTestId('varGroupSelector-credential_type');
      fireEvent.change(select, { target: { value: 'temporary_access_key' } });

      expect(defaultProps.onSelectionChange).toHaveBeenCalledWith(
        'credential_type',
        'temporary_access_key'
      );
    });

    it('should not render if only one option is visible', () => {
      const singleOptionGroup: RegistryVarGroup = {
        name: 'single',
        title: 'Single',
        selector_title: 'Select',
        options: [{ name: 'only_option', title: 'Only Option', vars: ['var1'] }],
      };

      const { container } = render(
        <VarGroupSelector
          {...defaultProps}
          varGroup={singleOptionGroup}
          selectedOptionName="only_option"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should filter options based on agentless deployment mode', () => {
      render(<VarGroupSelector {...defaultProps} isAgentlessEnabled={true} />);

      const select = screen.getByTestId('varGroupSelector-credential_type');
      const options = Array.from(select.querySelectorAll('option'));

      // assume_role should be filtered out in agentless mode
      expect(options.find((o) => o.value === 'assume_role')).toBeUndefined();
      // cloud_connectors should be visible in agentless mode
      expect(options.find((o) => o.value === 'cloud_connectors')).toBeDefined();
    });

    it('should filter options based on default deployment mode', () => {
      render(<VarGroupSelector {...defaultProps} isAgentlessEnabled={false} />);

      const select = screen.getByTestId('varGroupSelector-credential_type');
      const options = Array.from(select.querySelectorAll('option'));

      // cloud_connectors should be filtered out in default mode
      expect(options.find((o) => o.value === 'cloud_connectors')).toBeUndefined();
      // assume_role should be visible in default mode
      expect(options.find((o) => o.value === 'assume_role')).toBeDefined();
    });
  });

  describe('isVarRequiredByVarGroup', () => {
    const requiredVarGroup: RegistryVarGroup = {
      name: 'auth_method',
      title: 'Authentication',
      selector_title: 'Select method',
      required: true,
      options: [
        {
          name: 'api_key',
          title: 'API Key',
          vars: ['api_key', 'api_url'],
        },
        {
          name: 'oauth',
          title: 'OAuth',
          vars: ['client_id', 'client_secret'],
        },
      ],
    };

    const optionalVarGroup: RegistryVarGroup = {
      name: 'compression',
      title: 'Compression',
      selector_title: 'Select type',
      required: false,
      options: [
        {
          name: 'gzip',
          title: 'Gzip',
          vars: ['compression_level'],
        },
        {
          name: 'none',
          title: 'None',
          vars: [],
        },
      ],
    };

    it('should return true for var in selected option of required var_group', () => {
      const selections = { auth_method: 'api_key' };
      expect(isVarRequiredByVarGroup('api_key', [requiredVarGroup], selections)).toBe(true);
      expect(isVarRequiredByVarGroup('api_url', [requiredVarGroup], selections)).toBe(true);
    });

    it('should return false for var not in selected option of required var_group', () => {
      const selections = { auth_method: 'api_key' };
      expect(isVarRequiredByVarGroup('client_id', [requiredVarGroup], selections)).toBe(false);
      expect(isVarRequiredByVarGroup('client_secret', [requiredVarGroup], selections)).toBe(false);
    });

    it('should return false for var in optional var_group', () => {
      const selections = { compression: 'gzip' };
      expect(isVarRequiredByVarGroup('compression_level', [optionalVarGroup], selections)).toBe(
        false
      );
    });

    it('should return false for var not controlled by any var_group', () => {
      const selections = { auth_method: 'api_key' };
      expect(isVarRequiredByVarGroup('proxy_url', [requiredVarGroup], selections)).toBe(false);
    });

    it('should return false when varGroups is empty', () => {
      expect(isVarRequiredByVarGroup('api_key', [], { auth_method: 'api_key' })).toBe(false);
    });

    it('should return false when varGroupSelections is empty', () => {
      expect(isVarRequiredByVarGroup('api_key', [requiredVarGroup], {})).toBe(false);
    });

    it('should return true when oauth option is selected', () => {
      const selections = { auth_method: 'oauth' };
      expect(isVarRequiredByVarGroup('client_id', [requiredVarGroup], selections)).toBe(true);
      expect(isVarRequiredByVarGroup('client_secret', [requiredVarGroup], selections)).toBe(true);
      // api_key vars should not be required when oauth is selected
      expect(isVarRequiredByVarGroup('api_key', [requiredVarGroup], selections)).toBe(false);
    });

    it('should handle multiple var_groups with mixed required settings', () => {
      const selections = { auth_method: 'api_key', compression: 'gzip' };
      // Required var_group var should be required
      expect(
        isVarRequiredByVarGroup('api_key', [requiredVarGroup, optionalVarGroup], selections)
      ).toBe(true);
      // Optional var_group var should not be required
      expect(
        isVarRequiredByVarGroup(
          'compression_level',
          [requiredVarGroup, optionalVarGroup],
          selections
        )
      ).toBe(false);
    });

    it('should handle var_group without required field (defaults to false)', () => {
      const varGroupWithoutRequired: RegistryVarGroup = {
        name: 'test',
        title: 'Test',
        selector_title: 'Select',
        // Note: no required field
        options: [
          {
            name: 'opt1',
            title: 'Option 1',
            vars: ['var1'],
          },
        ],
      };

      const selections = { test: 'opt1' };
      expect(isVarRequiredByVarGroup('var1', [varGroupWithoutRequired], selections)).toBe(false);
    });
  });

  describe('Cloud Connector detection', () => {
    const cloudConnectorVarGroup: RegistryVarGroup = {
      name: 'setup_method',
      title: 'Setup Method',
      selector_title: 'Select method',
      options: [
        {
          name: 'cloud_connector',
          title: 'Cloud Connector',
          vars: ['role_arn', 'external_id'],
          cloud_connector_enabled: true,
          provider: 'aws',
        } as RegistryVarGroup['options'][0],
        {
          name: 'manual',
          title: 'Manual',
          vars: ['access_key_id', 'secret_access_key'],
        },
        {
          name: 'azure_cloud_connector',
          title: 'Azure Cloud Connector',
          vars: ['tenant_id', 'client_id'],
          cloud_connector_enabled: true,
          provider: 'azure',
        } as RegistryVarGroup['options'][0],
      ],
    };

    describe('isCloudConnectorOption', () => {
      it('should return true for option with cloud_connector_enabled: true', () => {
        const option = {
          name: 'cc',
          title: 'CC',
          vars: [],
          cloud_connector_enabled: true,
          provider: 'aws',
        } as RegistryVarGroup['options'][0];
        expect(isCloudConnectorOption(option)).toBe(true);
      });

      it('should return false for option without cloud_connector_enabled', () => {
        const option = { name: 'manual', title: 'Manual', vars: [] };
        expect(isCloudConnectorOption(option)).toBe(false);
      });

      it('should return false for option with cloud_connector_enabled: false', () => {
        const option = {
          name: 'x',
          title: 'X',
          vars: [],
          cloud_connector_enabled: false,
        } as RegistryVarGroup['options'][0];
        expect(isCloudConnectorOption(option)).toBe(false);
      });

      it('should return false for option with provider but no cloud_connector_enabled', () => {
        // provider alone does NOT make it a cloud connector
        const option = {
          name: 'x',
          title: 'X',
          vars: [],
          provider: 'aws',
        } as RegistryVarGroup['options'][0];
        expect(isCloudConnectorOption(option)).toBe(false);
      });
    });

    describe('getCloudProviderFromOption', () => {
      it('should return aws for option with provider: aws', () => {
        const option = {
          name: 'cc',
          title: 'CC',
          vars: [],
          provider: 'aws',
        } as RegistryVarGroup['options'][0];
        expect(getCloudProviderFromOption(option)).toBe('aws');
      });

      it('should return azure for option with provider: azure', () => {
        const option = {
          name: 'cc',
          title: 'CC',
          vars: [],
          provider: 'azure',
        } as RegistryVarGroup['options'][0];
        expect(getCloudProviderFromOption(option)).toBe('azure');
      });

      it('should return gcp for option with provider: gcp', () => {
        const option = {
          name: 'cc',
          title: 'CC',
          vars: [],
          provider: 'gcp',
        } as RegistryVarGroup['options'][0];
        expect(getCloudProviderFromOption(option)).toBe('gcp');
      });

      it('should return undefined for option without provider', () => {
        const option = { name: 'cc', title: 'CC', vars: [] };
        expect(getCloudProviderFromOption(option)).toBeUndefined();
      });

      it('should return undefined for invalid provider', () => {
        const option = {
          name: 'cc',
          title: 'CC',
          vars: [],
          provider: 'invalid',
        } as RegistryVarGroup['options'][0];
        expect(getCloudProviderFromOption(option)).toBeUndefined();
      });
    });

    describe('getCloudProviderFromVarGroupSelection', () => {
      it('should return provider when CC option is selected', () => {
        const selections = { setup_method: 'cloud_connector' };
        expect(getCloudProviderFromVarGroupSelection([cloudConnectorVarGroup], selections)).toBe(
          'aws'
        );
      });

      it('should return azure when Azure CC option is selected', () => {
        const selections = { setup_method: 'azure_cloud_connector' };
        expect(getCloudProviderFromVarGroupSelection([cloudConnectorVarGroup], selections)).toBe(
          'azure'
        );
      });

      it('should return undefined when non-CC option selected', () => {
        const selections = { setup_method: 'manual' };
        expect(
          getCloudProviderFromVarGroupSelection([cloudConnectorVarGroup], selections)
        ).toBeUndefined();
      });

      it('should return undefined for empty var_groups', () => {
        expect(getCloudProviderFromVarGroupSelection([], {})).toBeUndefined();
      });

      it('should return undefined for undefined inputs', () => {
        expect(getCloudProviderFromVarGroupSelection(undefined, undefined)).toBeUndefined();
      });

      it('should return undefined when no selection for the group', () => {
        const selections = { other_group: 'some_option' };
        expect(
          getCloudProviderFromVarGroupSelection([cloudConnectorVarGroup], selections)
        ).toBeUndefined();
      });
    });

    describe('isCloudConnectorSelectedInVarGroups', () => {
      it('should return true when CC option is selected', () => {
        const selections = { setup_method: 'cloud_connector' };
        expect(isCloudConnectorSelectedInVarGroups([cloudConnectorVarGroup], selections)).toBe(
          true
        );
      });

      it('should return true when Azure CC option is selected', () => {
        const selections = { setup_method: 'azure_cloud_connector' };
        expect(isCloudConnectorSelectedInVarGroups([cloudConnectorVarGroup], selections)).toBe(
          true
        );
      });

      it('should return false when non-CC option selected', () => {
        const selections = { setup_method: 'manual' };
        expect(isCloudConnectorSelectedInVarGroups([cloudConnectorVarGroup], selections)).toBe(
          false
        );
      });

      it('should return false for empty var_groups', () => {
        expect(isCloudConnectorSelectedInVarGroups([], {})).toBe(false);
      });

      it('should return false for undefined inputs', () => {
        expect(isCloudConnectorSelectedInVarGroups(undefined, undefined)).toBe(false);
      });

      it('should return false when no selection matches any group', () => {
        const selections = { other_group: 'some_option' };
        expect(isCloudConnectorSelectedInVarGroups([cloudConnectorVarGroup], selections)).toBe(
          false
        );
      });

      it('should handle multiple var_groups', () => {
        const anotherGroup: RegistryVarGroup = {
          name: 'another_group',
          title: 'Another',
          selector_title: 'Select',
          options: [
            {
              name: 'gcp_connector',
              title: 'GCP Connector',
              vars: ['project_id'],
              cloud_connector_enabled: true,
              provider: 'gcp',
            } as RegistryVarGroup['options'][0],
            { name: 'other', title: 'Other', vars: [] },
          ],
        };

        // CC selected in second group
        const selections = { setup_method: 'manual', another_group: 'gcp_connector' };
        expect(
          isCloudConnectorSelectedInVarGroups([cloudConnectorVarGroup, anotherGroup], selections)
        ).toBe(true);

        // No CC selected in any group
        const noCC = { setup_method: 'manual', another_group: 'other' };
        expect(
          isCloudConnectorSelectedInVarGroups([cloudConnectorVarGroup, anotherGroup], noCC)
        ).toBe(false);
      });
    });
  });
});
