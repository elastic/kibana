/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasRoleChanged } from './has_role_changed';
import type { Role } from '../../../../common';

const role: Role = {
  name: 'my_role',
  description: 'a role',
  elasticsearch: {
    cluster: ['manage', 'monitor'],
    indices: [{ names: ['foo*', 'bar*'], privileges: ['read', 'view_index_metadata'] }],
    run_as: ['user_a', 'user_b'],
  },
  kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['default', 'marketing'] }],
};

const clone = (value: Role): Role => JSON.parse(JSON.stringify(value));

describe('hasRoleChanged', () => {
  it('reports no changes for an untouched role', () => {
    expect(hasRoleChanged(role, clone(role))).toBe(false);
  });

  it('reports changes to the role itself', () => {
    expect(hasRoleChanged(role, { ...clone(role), description: 'a different role' })).toBe(true);
  });

  it('reports changes to elasticsearch privileges', () => {
    const updated = clone(role);
    updated.elasticsearch.cluster = ['manage'];
    expect(hasRoleChanged(role, updated)).toBe(true);
  });

  it('reports changes to kibana privileges', () => {
    const updated = clone(role);
    updated.kibana[0].feature.discover = ['read'];
    expect(hasRoleChanged(role, updated)).toBe(true);
  });

  it('reports no changes when a privilege list comes back in a different order', () => {
    // the form appends to these lists, so removing a privilege and adding it back reorders it
    const reordered = clone(role);
    reordered.elasticsearch.cluster = ['monitor', 'manage'];
    reordered.elasticsearch.indices[0].privileges = ['view_index_metadata', 'read'];
    reordered.elasticsearch.run_as = ['user_b', 'user_a'];
    reordered.kibana[0].spaces = ['marketing', 'default'];

    expect(hasRoleChanged(role, reordered)).toBe(false);
  });

  it('reports no changes when the form fills in blank values', () => {
    const withBlanks = clone(role);
    withBlanks.elasticsearch.indices[0].query = '';
    withBlanks.elasticsearch.indices[0].field_security = { grant: [], except: [] };
    withBlanks.kibana[0].base = [];

    expect(hasRoleChanged(role, withBlanks)).toBe(false);
  });

  it('reports no changes when an already empty field is cleared', () => {
    // clearing the description leaves `undefined` where the role had `''`
    expect(
      hasRoleChanged(
        { ...clone(role), description: '' },
        { ...clone(role), description: undefined }
      )
    ).toBe(false);
  });

  it('reports changes when a populated field is cleared', () => {
    expect(hasRoleChanged(role, { ...clone(role), description: undefined })).toBe(true);
  });

  it('reports changes when a blank value is given a value', () => {
    const updated = clone(role);
    updated.elasticsearch.indices[0].query = '{"match_all":{}}';
    expect(hasRoleChanged(role, updated)).toBe(true);
  });

  it('reports changes when a privilege is added or removed', () => {
    const added = clone(role);
    added.elasticsearch.indices[0].names.push('baz*');
    expect(hasRoleChanged(role, added)).toBe(true);

    const removed = clone(role);
    removed.kibana = [];
    expect(hasRoleChanged(role, removed)).toBe(true);
  });
});
