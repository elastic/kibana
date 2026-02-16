/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  toCreateProfilePayload,
  toFindProfilesQuery,
  toProfile,
  toProfilesListResult,
  toUpdateProfilePayload,
} from './adapters';

describe('profiles adapters', () => {
  it('maps list query from UI shape to API query conventions', () => {
    expect(
      toFindProfilesQuery({
        filter: 'host',
        targetType: 'data_view',
        targetId: 'dv-1',
        sortField: 'updatedAt',
        sortOrder: 'asc',
        page: 2,
        perPage: 50,
      })
    ).toEqual({
      filter: 'host',
      target_type: 'data_view',
      target_id: 'dv-1',
      sort_field: 'updated_at',
      sort_order: 'asc',
      page: 2,
      per_page: 50,
    });
  });

  it('maps camelCase transport profile to UI profile model', () => {
    const profile = toProfile({
      id: 'profile-1',
      name: 'Profile 1',
      targetType: 'data_view',
      targetId: 'dv-1',
      rules: {
        fieldRules: [
          { field: 'host.name', allowed: true, anonymized: true, entityClass: 'HOST_NAME' },
        ],
      },
      saltId: 'salt-default',
      namespace: 'default',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
    });

    expect(profile).toEqual({
      id: 'profile-1',
      name: 'Profile 1',
      description: undefined,
      targetType: 'data_view',
      targetId: 'dv-1',
      rules: {
        fieldRules: [
          { field: 'host.name', allowed: true, anonymized: true, entityClass: 'HOST_NAME' },
        ],
        regexRules: [],
        nerRules: [],
      },
      saltId: 'salt-default',
      namespace: 'default',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
    });
  });

  it('maps find response transport with perPage to UI list result', () => {
    const result = toProfilesListResult({
      page: 1,
      perPage: 10,
      total: 1,
      data: [
        {
          id: 'profile-1',
          name: 'Profile 1',
          targetType: 'index',
          targetId: 'logs-*',
          rules: { fieldRules: [] },
          saltId: 'salt-default',
          namespace: 'default',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          createdBy: 'elastic',
          updatedBy: 'elastic',
        },
      ],
    });

    expect(result.page).toBe(1);
    expect(result.perPage).toBe(10);
    expect(result.total).toBe(1);
    expect(result.data[0].targetType).toBe('index');
  });

  it('maps create/update payloads to API body conventions', () => {
    const createPayload = toCreateProfilePayload({
      name: 'New Profile',
      targetType: 'index_pattern',
      targetId: 'logs-*',
      rules: {
        fieldRules: [{ field: 'user.name', allowed: true, anonymized: false }],
        regexRules: [],
        nerRules: [],
      },
    });
    const updatePayload = toUpdateProfilePayload({
      id: 'profile-1',
      name: 'Updated Profile',
      rules: {
        fieldRules: [{ field: 'host.ip', allowed: true, anonymized: true, entityClass: 'IP' }],
      },
    });

    expect(createPayload.targetType).toBe('index_pattern');
    expect(createPayload.rules.fieldRules[0].field).toBe('user.name');
    expect(updatePayload.name).toBe('Updated Profile');
    expect(updatePayload.rules?.fieldRules[0].entityClass).toBe('IP');
  });

  it('throws when required profile response fields are missing', () => {
    expect(() =>
      toProfile({
        id: 'profile-1',
        name: 'Missing required fields',
      })
    ).toThrow('Invalid anonymization profile response payload');
  });
});
