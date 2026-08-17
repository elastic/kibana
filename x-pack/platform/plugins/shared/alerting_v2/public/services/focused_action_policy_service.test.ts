/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { FocusedActionPolicyService } from './focused_action_policy_service';

const createPolicy = (id: string): ActionPolicyResponse =>
  ({
    id,
    name: `Policy ${id}`,
    description: 'desc',
    enabled: true,
    destinations: [],
    matcher: null,
    group_by: null,
    tags: null,
    grouping_mode: 'per_episode',
    throttle: null,
    snoozed_until: null,
    created_by: 'alice',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'alice',
    updated_at: '2026-01-01T00:00:00.000Z',
    auth: { owner: 'alice', created_by_user: true },
  } as ActionPolicyResponse);

describe('FocusedActionPolicyService', () => {
  it('stores and clears the focused action policy', () => {
    const service = new FocusedActionPolicyService();
    const policy = createPolicy('policy-1');

    service.setFocusedActionPolicy(policy);

    expect(service.getFocusedActionPolicy()).toBe(policy);

    service.clearFocusedActionPolicy('policy-1');

    expect(service.getFocusedActionPolicy()).toBeUndefined();
  });

  it('does not clear a newer focused action policy with an older policy id', () => {
    const service = new FocusedActionPolicyService();
    const firstPolicy = createPolicy('policy-1');
    const secondPolicy = createPolicy('policy-2');

    service.setFocusedActionPolicy(firstPolicy);
    service.setFocusedActionPolicy(secondPolicy);
    service.clearFocusedActionPolicy('policy-1');

    expect(service.getFocusedActionPolicy()).toBe(secondPolicy);
  });
});
