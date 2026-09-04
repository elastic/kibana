/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKibanaRoleSchema } from './role_schema';

const basePrivilegeNamesMap = {
  global: ['all', 'read'],
  space: ['all', 'read'],
};

describe('getKibanaRoleSchema', () => {
  describe('input hardening', () => {
    test('resolves base privilege names at most once regardless of entry/privilege count', () => {
      const getBasePrivilegeNames = jest.fn(() => basePrivilegeNamesMap);
      const kibana = Array.from({ length: 25 }, (_unused, i) => ({
        spaces: [`space-${i}`],
        base: ['all', 'read'],
      }));

      expect(() => getKibanaRoleSchema(getBasePrivilegeNames).validate(kibana)).not.toThrow();

      // Without memoization this would be invoked once per base privilege entry (50 times here);
      // the expensive privilege-map resolution must happen at most once per schema.
      expect(getBasePrivilegeNames).toHaveBeenCalledTimes(1);
    });

    test('rejects more than 1000 Kibana privilege entries', () => {
      const kibana = Array.from({ length: 1001 }, (_unused, i) => ({
        spaces: [`space-${i}`],
        base: ['all'],
      }));

      expect(() =>
        getKibanaRoleSchema(() => basePrivilegeNamesMap).validate(kibana)
      ).toThrowErrorMatchingInlineSnapshot(
        `"array size is [1001], but cannot be greater than [1000]"`
      );
    });

    test('allows up to 1000 Kibana privilege entries', () => {
      const kibana = Array.from({ length: 1000 }, (_unused, i) => ({
        spaces: [`space-${i}`],
        base: ['all'],
      }));

      expect(() => getKibanaRoleSchema(() => basePrivilegeNamesMap).validate(kibana)).not.toThrow();
    });
  });

  describe('space overlap', () => {
    test('rejects the same space claimed by two entries', () => {
      expect(() =>
        getKibanaRoleSchema(() => basePrivilegeNamesMap).validate([
          { feature: { foo: ['foo-privilege-1'] }, spaces: ['marketing'] },
          { feature: { bar: ['bar-privilege-1'] }, spaces: ['sales', 'marketing'] },
        ])
      ).toThrowErrorMatchingInlineSnapshot(
        `"more than one privilege is applied to the following spaces: [marketing]"`
      );
    });

    test('reports the first duplicate when two entries share multiple spaces', () => {
      expect(() =>
        getKibanaRoleSchema(() => basePrivilegeNamesMap).validate([
          { base: ['all'], spaces: ['alpha', 'beta'] },
          { base: ['read'], spaces: ['alpha', 'beta'] },
        ])
      ).toThrowErrorMatchingInlineSnapshot(
        `"more than one privilege is applied to the following spaces: [alpha]"`
      );
    });

    test('rejects duplicate space IDs within a single entry', () => {
      expect(() =>
        getKibanaRoleSchema(() => basePrivilegeNamesMap).validate([
          { base: ['all'], spaces: ['marketing', 'marketing'] },
        ])
      ).toThrowErrorMatchingInlineSnapshot(
        `"more than one privilege is applied to the following spaces: [marketing]"`
      );
    });

    test('allows disjoint spaces across entries', () => {
      expect(() =>
        getKibanaRoleSchema(() => basePrivilegeNamesMap).validate([
          { base: ['all'], spaces: ['marketing'] },
          { base: ['read'], spaces: ['sales'] },
        ])
      ).not.toThrow();
    });
  });
});
