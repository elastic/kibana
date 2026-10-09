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
        tags: ['a', 'b'],
        enabled: true,
        sortField: 'name',
        sortOrder: 'asc',
      })
    ).toEqual({
      page: 3,
      per_page: 10,
      search: 'slack',
      tags: ['a', 'b'],
      enabled: true,
      sort_field: 'name',
      sort_order: 'asc',
    });
  });
});
