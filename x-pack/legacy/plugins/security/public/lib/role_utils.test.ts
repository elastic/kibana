/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Role } from '../../common/model';
import {
  copyRole,
  isReadOnlyRole,
  isReservedRole,
  isRoleEnabled,
  prepareRoleClone,
} from './role_utils';

describe('role', () => {
  describe('isRoleEnabled', () => {
    test('should return false if role is explicitly not enabled', () => {
      const testRole = {
        transient_metadata: {
          enabled: false,
        },
      };
      expect(isRoleEnabled(testRole)).toBe(false);
    });

    test('should return true if role is explicitly enabled', () => {
      const testRole = {
        transient_metadata: {
          enabled: true,
        },
      };
      expect(isRoleEnabled(testRole)).toBe(true);
    });

    test('should return true if role is NOT explicitly enabled or disabled', () => {
      const testRole = {};
      expect(isRoleEnabled(testRole)).toBe(true);
    });
  });

  describe('isReservedRole', () => {
    test('should return false if role is explicitly not reserved', () => {
      const testRole = {
        metadata: {
          _reserved: false,
        },
      };
      expect(isReservedRole(testRole)).toBe(false);
    });

    test('should return true if role is explicitly reserved', () => {
      const testRole = {
        metadata: {
          _reserved: true,
        },
      };
      expect(isReservedRole(testRole)).toBe(true);
    });

    test('should return false if role is NOT explicitly reserved or not reserved', () => {
      const testRole = {};
      expect(isReservedRole(testRole)).toBe(false);
    });
  });

  describe('isReadOnlyRole', () => {
    test('returns true for reserved roles', () => {
      const testRole = {
        metadata: {
          _reserved: true,
        },
      };
      expect(isReadOnlyRole(testRole)).toBe(true);
    });

    test('returns true for roles with transform errors', () => {
      const testRole = {
        _transform_error: ['kibana'],
      };
      expect(isReadOnlyRole(testRole)).toBe(true);
    });

    test('returns false for disabled roles', () => {
      const testRole = {
        transient_metadata: {
          enabled: false,
        },
      };
      expect(isReadOnlyRole(testRole)).toBe(false);
    });

    test('returns false for all other roles', () => {
      const testRole = {};
      expect(isReadOnlyRole(testRole)).toBe(false);
    });
  });

  describe('copyRole', () => {
    it('should perform a deep copy', () => {
      const role: Role = {
        name: '',
        elasticsearch: {
          cluster: ['all'],
          indices: [{ names: ['index*'], privileges: ['all'] }],
          run_as: ['user'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
          {
            spaces: ['default'],
            base: ['foo'],
            feature: {},
          },
          {
            spaces: ['marketing'],
            base: ['read'],
            feature: {},
          },
        ],
      };

      const result = copyRole(role);
      expect(result).toEqual(role);

      role.elasticsearch.indices[0].names = ['something else'];

      expect(result).not.toEqual(role);
    });
  });

  describe('prepareRoleClone', () => {
    it('should return a copy of the role, with a blank role name', () => {
      const role: Role = {
        name: 'my_role',
        elasticsearch: {
          cluster: ['all'],
          indices: [{ names: ['index*'], privileges: ['all'] }],
          run_as: ['user'],
        },
        kibana: [
          {
            spaces: ['*'],
            base: ['all'],
            feature: {},
          },
          {
            spaces: ['default'],
            base: ['foo'],
            feature: {},
          },
          {
            spaces: ['marketing'],
            base: ['read'],
            feature: {},
          },
        ],
        metadata: {
          _reserved: true,
        },
        transient_metadata: {
          enabled: false,
        },
      };

      const { name: originalName, ...originalRest } = role;

      const result = prepareRoleClone(role);
      const { name, ...rest } = result;

      expect(originalName).toEqual('my_role');
      expect(name).toEqual('');

      expect(rest).toEqual(originalRest);
    });
  });
});
