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
  inferVarGroupSelections,
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

  describe('inferVarGroupSelections', () => {
    // Mirrors the aws package's credential_type var_group
    const awsCredentialVarGroup = (): RegistryVarGroup => ({
      name: 'credential_type',
      title: 'Setup Access',
      selector_title: 'Preferred method',
      required: true,
      options: [
        {
          name: 'identity_federation',
          title: 'Identity Federation',
          vars: ['role_arn', 'supports_identity_federation'],
          provider: 'aws',
        },
        {
          name: 'direct_access_key',
          title: 'Direct Access Keys',
          vars: ['access_key_id', 'secret_access_key'],
        },
        {
          name: 'temporary_access_key',
          title: 'Temporary Access Keys',
          vars: ['access_key_id', 'secret_access_key', 'session_token'],
        },
        {
          name: 'assume_role',
          title: 'Assume Role',
          vars: ['role_arn'],
        },
        {
          name: 'shared_credentials',
          title: 'Shared Credentials',
          vars: ['shared_credential_file', 'credential_profile_name'],
        },
      ],
    });

    it('should infer direct_access_key from populated access keys (upgrade regression case)', () => {
      // A pre-var_groups policy configured with Direct Access Keys must not be
      // presented as identity_federation (the first option) after upgrade
      const inferred = inferVarGroupSelections([awsCredentialVarGroup()], {
        access_key_id: { type: 'text', value: 'AKIA123' },
        secret_access_key: { type: 'password', value: 'secret' },
        role_arn: { type: 'text', value: '' },
      });

      expect(inferred).toEqual({ credential_type: 'direct_access_key' });
    });

    it('should prefer temporary_access_key when session_token is also populated', () => {
      const inferred = inferVarGroupSelections([awsCredentialVarGroup()], {
        access_key_id: { type: 'text', value: 'AKIA123' },
        secret_access_key: { type: 'password', value: 'secret' },
        session_token: { type: 'password', value: 'token' },
      });

      expect(inferred).toEqual({ credential_type: 'temporary_access_key' });
    });

    it('should prefer assume_role over identity_federation when only role_arn is set', () => {
      // assume_role is fully populated (1/1) while identity_federation is not (1/2)
      const inferred = inferVarGroupSelections([awsCredentialVarGroup()], {
        role_arn: { type: 'text', value: 'arn:aws:iam::123:role/x' },
      });

      expect(inferred).toEqual({ credential_type: 'assume_role' });
    });

    it('should infer identity_federation when its flag is explicitly true', () => {
      const inferred = inferVarGroupSelections([awsCredentialVarGroup()], {
        role_arn: { type: 'text', value: 'arn:aws:iam::123:role/x' },
        supports_identity_federation: { type: 'bool', value: true },
      });

      expect(inferred).toEqual({ credential_type: 'identity_federation' });
    });

    it('should not count a false boolean as evidence (sanitized migration default)', () => {
      const inferred = inferVarGroupSelections([awsCredentialVarGroup()], {
        access_key_id: { type: 'text', value: 'AKIA123' },
        secret_access_key: { type: 'password', value: 'secret' },
        supports_identity_federation: { type: 'bool', value: false },
      });

      expect(inferred).toEqual({ credential_type: 'direct_access_key' });
    });

    it('should count secret references as configured values', () => {
      const inferred = inferVarGroupSelections([awsCredentialVarGroup()], {
        access_key_id: { type: 'text', value: 'AKIA123' },
        secret_access_key: { type: 'password', value: { id: 'secret-ref-id', isSecretRef: true } },
      });

      expect(inferred).toEqual({ credential_type: 'direct_access_key' });
    });

    it('should return undefined when no option vars are populated', () => {
      expect(
        inferVarGroupSelections([awsCredentialVarGroup()], {
          unrelated_var: { type: 'text', value: 'something' },
          role_arn: { type: 'text', value: '' },
        })
      ).toBeUndefined();
    });

    it('should return undefined for missing inputs', () => {
      expect(inferVarGroupSelections(undefined, { a: { value: 'x' } })).toBeUndefined();
      expect(inferVarGroupSelections([], { a: { value: 'x' } })).toBeUndefined();
      expect(inferVarGroupSelections([awsCredentialVarGroup()], undefined)).toBeUndefined();
    });

    it('should leave a group unselected on an unresolvable tie', () => {
      const varGroup: RegistryVarGroup = {
        name: 'ambiguous',
        title: 'Ambiguous',
        selector_title: 'Pick one',
        options: [
          { name: 'a', title: 'A', vars: ['shared_var'] },
          { name: 'b', title: 'B', vars: ['shared_var'] },
        ],
      };

      expect(inferVarGroupSelections([varGroup], { shared_var: { value: 'set' } })).toBeUndefined();
    });

    it('should infer independently across multiple var_groups', () => {
      const secondGroup: RegistryVarGroup = {
        name: 'data_collection',
        title: 'Data Collection',
        selector_title: 'Mode',
        options: [
          { name: 'polling', title: 'Polling', vars: ['poll_interval'] },
          { name: 'streaming', title: 'Streaming', vars: ['stream_endpoint'] },
        ],
      };

      const inferred = inferVarGroupSelections([awsCredentialVarGroup(), secondGroup], {
        access_key_id: { type: 'text', value: 'AKIA123' },
        secret_access_key: { type: 'password', value: 'secret' },
        stream_endpoint: { type: 'text', value: 'https://stream.example.com' },
      });

      expect(inferred).toEqual({
        credential_type: 'direct_access_key',
        data_collection: 'streaming',
      });
    });
  });
});
