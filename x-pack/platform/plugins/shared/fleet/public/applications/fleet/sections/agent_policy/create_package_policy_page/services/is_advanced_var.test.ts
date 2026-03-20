/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryVarGroup } from '../../../../types';

import { isAdvancedVar } from './is_advanced_var';
import { isVarInSelectedVarGroupOption } from './var_group_helpers';

describe('Fleet - isAdvancedVar', () => {
  it('returns true for vars that should be show under advanced options', () => {
    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
        required: true,
        default: 'default string',
      })
    ).toBe(true);

    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
        default: 'default string',
      })
    ).toBe(true);

    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
      })
    ).toBe(true);
  });

  it('returns false for vars that should be show by default', () => {
    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
        required: true,
        default: 'default string',
        show_user: true,
      })
    ).toBe(false);

    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
        required: true,
      })
    ).toBe(false);

    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
        show_user: true,
      })
    ).toBe(false);
  });

  describe('with var_groups context', () => {
    const mockVarGroups: RegistryVarGroup[] = [
      {
        name: 'auth_method',
        title: 'Authentication',
        selector_title: 'Select method',
        options: [
          { name: 'api_key', title: 'API Key', vars: ['api_key', 'api_url'] },
          { name: 'oauth', title: 'OAuth', vars: ['client_id', 'client_secret'] },
        ],
      },
    ];

    it('returns false (not advanced) for vars with show_user: false that are in a selected var_group option', () => {
      // api_key var has show_user: false but is in the selected var_group option
      expect(
        isAdvancedVar(
          {
            name: 'api_key',
            type: 'password',
            show_user: false, // Would normally be advanced
          },
          mockVarGroups,
          { auth_method: 'api_key' } // api_key option is selected
        )
      ).toBe(false); // Should NOT be advanced because it's in the selected option
    });

    it('returns true (advanced) for vars with show_user: false that are NOT in a selected var_group option', () => {
      // client_id var has show_user: false and is NOT in the selected var_group option
      expect(
        isAdvancedVar(
          {
            name: 'client_id',
            type: 'text',
            show_user: false,
          },
          mockVarGroups,
          { auth_method: 'api_key' } // api_key option is selected, not oauth
        )
      ).toBe(true); // Should be advanced because it's not in the selected option
    });

    it('returns true (advanced) for vars with show_user: false that are not controlled by any var_group', () => {
      expect(
        isAdvancedVar(
          {
            name: 'unrelated_var',
            type: 'text',
            show_user: false,
          },
          mockVarGroups,
          { auth_method: 'api_key' }
        )
      ).toBe(true); // Should be advanced because it's not controlled by var_groups
    });

    it('returns false for vars with show_user: true regardless of var_groups', () => {
      expect(
        isAdvancedVar(
          {
            name: 'api_key',
            type: 'password',
            show_user: true,
          },
          mockVarGroups,
          { auth_method: 'oauth' } // Different option selected
        )
      ).toBe(false); // show_user: true always wins
    });

    it('handles missing var_groups gracefully', () => {
      expect(
        isAdvancedVar(
          {
            name: 'mock_var',
            type: 'text',
            show_user: false,
          },
          undefined,
          { auth_method: 'api_key' }
        )
      ).toBe(true); // Falls back to original behavior
    });

    it('handles empty var_groups gracefully', () => {
      expect(
        isAdvancedVar(
          {
            name: 'mock_var',
            type: 'text',
            show_user: false,
          },
          [],
          { auth_method: 'api_key' }
        )
      ).toBe(true); // Falls back to original behavior
    });

    it('handles missing varGroupSelections gracefully', () => {
      expect(
        isAdvancedVar(
          {
            name: 'api_key',
            type: 'password',
            show_user: false,
          },
          mockVarGroups,
          undefined
        )
      ).toBe(true); // Falls back to original behavior
    });
  });
});

describe('Fleet - isVarInSelectedVarGroupOption', () => {
  const mockVarGroups: RegistryVarGroup[] = [
    {
      name: 'auth_method',
      title: 'Authentication',
      selector_title: 'Select method',
      options: [
        { name: 'api_key', title: 'API Key', vars: ['api_key', 'api_url'] },
        { name: 'oauth', title: 'OAuth', vars: ['client_id', 'client_secret'] },
      ],
    },
    {
      name: 'data_format',
      title: 'Data Format',
      selector_title: 'Select format',
      options: [
        { name: 'json', title: 'JSON', vars: ['json_config'] },
        { name: 'xml', title: 'XML', vars: ['xml_config'] },
      ],
    },
  ];

  it('returns true if var is in a selected var_group option', () => {
    expect(
      isVarInSelectedVarGroupOption('api_key', mockVarGroups, { auth_method: 'api_key' })
    ).toBe(true);

    expect(
      isVarInSelectedVarGroupOption('api_url', mockVarGroups, { auth_method: 'api_key' })
    ).toBe(true);

    expect(
      isVarInSelectedVarGroupOption('client_id', mockVarGroups, { auth_method: 'oauth' })
    ).toBe(true);
  });

  it('returns false if var is NOT in a selected var_group option', () => {
    expect(
      isVarInSelectedVarGroupOption('client_id', mockVarGroups, { auth_method: 'api_key' })
    ).toBe(false);

    expect(isVarInSelectedVarGroupOption('api_key', mockVarGroups, { auth_method: 'oauth' })).toBe(
      false
    );
  });

  it('returns false if var is not controlled by any var_group', () => {
    expect(
      isVarInSelectedVarGroupOption('unrelated_var', mockVarGroups, { auth_method: 'api_key' })
    ).toBe(false);
  });

  it('returns false if no selection is made for the var_group', () => {
    expect(isVarInSelectedVarGroupOption('api_key', mockVarGroups, {})).toBe(false);

    expect(isVarInSelectedVarGroupOption('api_key', mockVarGroups, { data_format: 'json' })).toBe(
      false
    );
  });

  it('handles multiple var_groups correctly', () => {
    const selections = { auth_method: 'api_key', data_format: 'json' };

    expect(isVarInSelectedVarGroupOption('api_key', mockVarGroups, selections)).toBe(true);
    expect(isVarInSelectedVarGroupOption('json_config', mockVarGroups, selections)).toBe(true);
    expect(isVarInSelectedVarGroupOption('xml_config', mockVarGroups, selections)).toBe(false);
    expect(isVarInSelectedVarGroupOption('client_id', mockVarGroups, selections)).toBe(false);
  });
});
