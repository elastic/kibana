/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFindActionPoliciesRequest } from './action_policies_data_source';

describe('toFindActionPoliciesRequest', () => {
  it('maps camelCase view state to the snake_case request', () => {
    expect(
      toFindActionPoliciesRequest({
        page: 3,
        perPage: 10,
        search: 'slack',
        enabled: true,
        sortField: 'name',
        sortOrder: 'asc',
      })
    ).toEqual({
      page: 3,
      per_page: 10,
      filter: 'enabled: true',
      search: 'slack',
      sort_field: 'name',
      sort_order: 'asc',
    });
  });

  it('maps a disabled state filter to a KQL filter', () => {
    expect(toFindActionPoliciesRequest({ enabled: false }).filter).toBe('enabled: false');
  });

  it('omits the filter when no state filter is selected', () => {
    expect(toFindActionPoliciesRequest({}).filter).toBeUndefined();
  });
});
