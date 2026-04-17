/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryVarGroup } from '../types';

import {
  getSelectedOption,
  getVisibleVarsForOption,
  getVarsControlledByVarGroups,
  shouldShowVar,
  isVarRequiredByVarGroup,
  isVarInSelectedVarGroupOption,
  type VarGroupSelection,
} from './var_group_helpers';

describe('var_group_helpers', () => {
  const createMockVarGroup = (): RegistryVarGroup => ({
    name: 'credential_type',
    title: 'Setup Access',
    selector_title: 'Preferred method',
    options: [
      {
        name: 'direct_access_key',
        title: 'Direct Access Keys',
        vars: ['access_key_id', 'secret_access_key'],
      },
      {
        name: 'assume_role',
        title: 'Assume Role',
        vars: ['role_arn', 'external_id'],
        provider: 'aws',
      },
    ],
  });

  const createRequiredVarGroup = (): RegistryVarGroup => ({
    name: 'auth_type',
    title: 'Authentication Type',
    selector_title: 'Select auth type',
    required: true,
    options: [
      {
        name: 'oauth',
        title: 'OAuth',
        vars: ['client_id', 'client_secret'],
      },
      {
        name: 'api_key',
        title: 'API Key',
        vars: ['api_key'],
      },
    ],
  });

  const createMultipleVarGroups = (): RegistryVarGroup[] => [
    createMockVarGroup(),
    createRequiredVarGroup(),
  ];

  describe('getSelectedOption', () => {
    it('should return undefined when selectedOptionName is undefined', () => {
      const varGroup = createMockVarGroup();
      const result = getSelectedOption(varGroup, undefined);
      expect(result).toBeUndefined();
    });

    it('should return the selected option when found', () => {
      const varGroup = createMockVarGroup();
      const result = getSelectedOption(varGroup, 'direct_access_key');
      expect(result).toBeDefined();
      expect(result?.name).toBe('direct_access_key');
      expect(result?.vars).toEqual(['access_key_id', 'secret_access_key']);
    });

    it('should return undefined when option name does not exist', () => {
      const varGroup = createMockVarGroup();
      const result = getSelectedOption(varGroup, 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return option with provider field', () => {
      const varGroup = createMockVarGroup();
      const result = getSelectedOption(varGroup, 'assume_role');
      expect(result?.provider).toBe('aws');
    });
  });

  describe('getVisibleVarsForOption', () => {
    it('should return undefined when selectedOptionName is undefined', () => {
      const varGroup = createMockVarGroup();
      const result = getVisibleVarsForOption(varGroup, undefined);
      expect(result).toBeUndefined();
    });

    it('should return vars for the selected option', () => {
      const varGroup = createMockVarGroup();
      const result = getVisibleVarsForOption(varGroup, 'direct_access_key');
      expect(result).toEqual(['access_key_id', 'secret_access_key']);
    });

    it('should return undefined when option does not exist', () => {
      const varGroup = createMockVarGroup();
      const result = getVisibleVarsForOption(varGroup, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getVarsControlledByVarGroups', () => {
    it('should return empty set for empty varGroups', () => {
      const result = getVarsControlledByVarGroups([]);
      expect(result).toEqual(new Set());
    });

    it('should return all vars from all options in all var_groups', () => {
      const varGroups = createMultipleVarGroups();
      const result = getVarsControlledByVarGroups(varGroups);

      // From credential_type group
      expect(result.has('access_key_id')).toBe(true);
      expect(result.has('secret_access_key')).toBe(true);
      expect(result.has('role_arn')).toBe(true);
      expect(result.has('external_id')).toBe(true);

      // From auth_type group
      expect(result.has('client_id')).toBe(true);
      expect(result.has('client_secret')).toBe(true);
      expect(result.has('api_key')).toBe(true);
    });

    it('should return set with correct size', () => {
      const varGroups = createMultipleVarGroups();
      const result = getVarsControlledByVarGroups(varGroups);
      expect(result.size).toBe(7);
    });
  });

  describe('shouldShowVar', () => {
    it('should return true for vars not controlled by any var_group', () => {
      const varGroups = [createMockVarGroup()];
      const selections: VarGroupSelection = { credential_type: 'direct_access_key' };

      // 'some_other_var' is not in any var_group
      const result = shouldShowVar('some_other_var', varGroups, selections);
      expect(result).toBe(true);
    });

    it('should return true for vars in the selected option', () => {
      const varGroups = [createMockVarGroup()];
      const selections: VarGroupSelection = { credential_type: 'direct_access_key' };

      expect(shouldShowVar('access_key_id', varGroups, selections)).toBe(true);
      expect(shouldShowVar('secret_access_key', varGroups, selections)).toBe(true);
    });

    it('should return false for vars in non-selected options', () => {
      const varGroups = [createMockVarGroup()];
      const selections: VarGroupSelection = { credential_type: 'direct_access_key' };

      // role_arn and external_id are in assume_role, not direct_access_key
      expect(shouldShowVar('role_arn', varGroups, selections)).toBe(false);
      expect(shouldShowVar('external_id', varGroups, selections)).toBe(false);
    });

    it('should handle multiple var_groups correctly', () => {
      const varGroups = createMultipleVarGroups();
      const selections: VarGroupSelection = {
        credential_type: 'assume_role',
        auth_type: 'oauth',
      };

      // Vars from selected options should be visible
      expect(shouldShowVar('role_arn', varGroups, selections)).toBe(true);
      expect(shouldShowVar('client_id', varGroups, selections)).toBe(true);

      // Vars from non-selected options should be hidden
      expect(shouldShowVar('access_key_id', varGroups, selections)).toBe(false);
      expect(shouldShowVar('api_key', varGroups, selections)).toBe(false);
    });
  });

  describe('isVarRequiredByVarGroup', () => {
    it('should return false when varGroups is undefined', () => {
      const result = isVarRequiredByVarGroup('client_id', undefined, { auth_type: 'oauth' });
      expect(result).toBe(false);
    });

    it('should return false when varGroups is empty', () => {
      const result = isVarRequiredByVarGroup('client_id', [], { auth_type: 'oauth' });
      expect(result).toBe(false);
    });

    it('should return false when varGroupSelections is undefined', () => {
      const varGroups = [createRequiredVarGroup()];
      const result = isVarRequiredByVarGroup('client_id', varGroups, undefined);
      expect(result).toBe(false);
    });

    it('should return true for vars in required var_group selected option', () => {
      const varGroups = [createRequiredVarGroup()];
      const selections: VarGroupSelection = { auth_type: 'oauth' };

      expect(isVarRequiredByVarGroup('client_id', varGroups, selections)).toBe(true);
      expect(isVarRequiredByVarGroup('client_secret', varGroups, selections)).toBe(true);
    });

    it('should return false for vars in non-required var_group', () => {
      const varGroups = [createMockVarGroup()]; // not required
      const selections: VarGroupSelection = { credential_type: 'direct_access_key' };

      expect(isVarRequiredByVarGroup('access_key_id', varGroups, selections)).toBe(false);
    });

    it('should return false for vars in non-selected option of required var_group', () => {
      const varGroups = [createRequiredVarGroup()];
      const selections: VarGroupSelection = { auth_type: 'oauth' };

      // api_key is in the api_key option, not oauth
      expect(isVarRequiredByVarGroup('api_key', varGroups, selections)).toBe(false);
    });
  });

  describe('isVarInSelectedVarGroupOption', () => {
    it('should return false for vars not controlled by any var_group', () => {
      const varGroups = [createMockVarGroup()];
      const selections: VarGroupSelection = { credential_type: 'direct_access_key' };

      const result = isVarInSelectedVarGroupOption('some_other_var', varGroups, selections);
      expect(result).toBe(false);
    });

    it('should return true for vars in selected option', () => {
      const varGroups = [createMockVarGroup()];
      const selections: VarGroupSelection = { credential_type: 'direct_access_key' };

      expect(isVarInSelectedVarGroupOption('access_key_id', varGroups, selections)).toBe(true);
      expect(isVarInSelectedVarGroupOption('secret_access_key', varGroups, selections)).toBe(true);
    });

    it('should return false for vars in non-selected option', () => {
      const varGroups = [createMockVarGroup()];
      const selections: VarGroupSelection = { credential_type: 'direct_access_key' };

      expect(isVarInSelectedVarGroupOption('role_arn', varGroups, selections)).toBe(false);
      expect(isVarInSelectedVarGroupOption('external_id', varGroups, selections)).toBe(false);
    });

    it('should differ from shouldShowVar for uncontrolled vars', () => {
      const varGroups = [createMockVarGroup()];
      const selections: VarGroupSelection = { credential_type: 'direct_access_key' };

      // shouldShowVar returns true for uncontrolled vars
      expect(shouldShowVar('some_other_var', varGroups, selections)).toBe(true);

      // isVarInSelectedVarGroupOption returns false for uncontrolled vars
      expect(isVarInSelectedVarGroupOption('some_other_var', varGroups, selections)).toBe(false);
    });
  });
});
