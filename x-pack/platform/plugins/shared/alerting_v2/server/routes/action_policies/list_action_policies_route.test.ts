/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import {
  toFindActionPoliciesArgs,
  toFindActionPoliciesResponse,
} from './list_action_policies_route';

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

  it.each([
    ['created_at', 'createdAt'],
    ['updated_at', 'updatedAt'],
  ] as const)('translates the %s sort value to %s', (apiValue, clientValue) => {
    expect(toFindActionPoliciesArgs({ sort_field: apiValue }).sortField).toBe(clientValue);
  });

  it('leaves sortField undefined when no sort_field is provided', () => {
    expect(toFindActionPoliciesArgs({}).sortField).toBeUndefined();
  });
});

describe('toFindActionPoliciesResponse', () => {
  // Items are already the snake_case API shape; only the envelope needs mapping.
  const item = { id: 'policy-1', name: 'My policy' } as ActionPolicyResponse;

  it('maps the camelCase envelope onto the snake_case response body', () => {
    expect(toFindActionPoliciesResponse({ items: [item], total: 1, page: 2, perPage: 10 })).toEqual(
      { items: [item], total: 1, page: 2, per_page: 10 }
    );
  });
});
