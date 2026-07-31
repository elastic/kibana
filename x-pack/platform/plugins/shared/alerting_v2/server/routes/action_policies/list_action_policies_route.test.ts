/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFindActionPoliciesArgs } from './list_action_policies_route';

describe('toFindActionPoliciesArgs', () => {
  it('maps the snake_case request to camelCase client args', () => {
    expect(
      toFindActionPoliciesArgs({
        page: 3,
        per_page: 10,
        search: 'slack',
        tags: ['a', 'b'],
        enabled: true,
        sort_field: 'name',
        sort_order: 'asc',
      })
    ).toEqual({
      page: 3,
      perPage: 10,
      search: 'slack',
      tags: ['a', 'b'],
      enabled: true,
      sortField: 'name',
      sortOrder: 'asc',
    });
  });
});
