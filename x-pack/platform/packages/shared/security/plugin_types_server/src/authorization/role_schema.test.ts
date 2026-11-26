/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchRoleSchema, getKibanaRoleSchema } from './role_schema';

describe('elasticsearchRoleSchema', () => {
  test('accepts more than 100 names in role privilege arrays', () => {
    const names = Array.from({ length: 657 }, (_unused, index) => `index-${index}`);
    const users = Array.from({ length: 657 }, (_unused, index) => `user-${index}`);

    expect(() =>
      elasticsearchRoleSchema.validate({
        indices: [{ names, privileges: ['read'] }],
        remote_indices: [{ clusters: ['remote'], names, privileges: ['read'] }],
        run_as: users,
      })
    ).not.toThrow();
  });

  test.each([
    { name: 'cluster privileges', role: (values: string[]) => ({ cluster: values }) },
    {
      name: 'remote cluster privileges',
      role: (values: string[]) => ({
        remote_cluster: [{ privileges: values, clusters: ['remote'] }],
      }),
    },
    {
      name: 'remote cluster aliases',
      role: (values: string[]) => ({
        remote_cluster: [{ privileges: ['monitor_enrich'], clusters: values }],
      }),
    },
    {
      name: 'remote cluster entries',
      role: (values: string[]) => ({
        remote_cluster: values.map((cluster) => ({
          privileges: ['monitor_enrich'],
          clusters: [cluster],
        })),
      }),
    },
    {
      name: 'index names',
      role: (values: string[]) => ({ indices: [{ names: values, privileges: ['read'] }] }),
    },
    {
      name: 'index privileges',
      role: (values: string[]) => ({ indices: [{ names: ['index'], privileges: values }] }),
    },
    {
      name: 'remote index aliases',
      role: (values: string[]) => ({
        remote_indices: [{ clusters: values, names: ['index'], privileges: ['read'] }],
      }),
    },
    {
      name: 'remote index names',
      role: (values: string[]) => ({
        remote_indices: [{ clusters: ['remote'], names: values, privileges: ['read'] }],
      }),
    },
    {
      name: 'remote index privileges',
      role: (values: string[]) => ({
        remote_indices: [{ clusters: ['remote'], names: ['index'], privileges: values }],
      }),
    },
    { name: 'run-as users', role: (values: string[]) => ({ run_as: values }) },
  ])('$name accepts 1000 entries and rejects 1001', ({ role }) => {
    const values = Array.from({ length: 1001 }, (_unused, index) => `value-${index}`);

    expect(() => elasticsearchRoleSchema.validate(role(values.slice(0, 1000)))).not.toThrow();
    expect(() => elasticsearchRoleSchema.validate(role(values))).toThrow(
      'array size is [1001], but cannot be greater than [1000]'
    );
  });
});

const basePrivilegeNamesMap = {
  global: ['all', 'read'],
  space: ['all', 'read'],
};

describe('getKibanaRoleSchema', () => {
  describe('input hardening', () => {
    test('feature privileges accept 1000 entries and reject 1001', () => {
      const values = Array.from({ length: 1001 }, (_unused, index) => `privilege-${index}`);
      const role = (privileges: string[]) => [{ feature: { foo: privileges } }];
      const roleSchema = getKibanaRoleSchema(() => basePrivilegeNamesMap);

      expect(() => roleSchema.validate(role(values.slice(0, 1000)))).not.toThrow();
      expect(() => roleSchema.validate(role(values))).toThrow(
        'array size is [1001], but cannot be greater than [1000]'
      );
    });

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
