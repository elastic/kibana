/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toFindRulesArgs } from './get_rules_route';

describe('toFindRulesArgs', () => {
  it('maps the snake_case request to camelCase client args', () => {
    expect(
      toFindRulesArgs({
        page: 2,
        per_page: 50,
        filter: 'my-filter',
        search: 'error',
        sort_field: 'name',
        sort_order: 'desc',
      })
    ).toEqual({
      page: 2,
      perPage: 50,
      filter: 'my-filter',
      search: 'error',
      sortField: 'name',
      sortOrder: 'desc',
    });
  });
});
