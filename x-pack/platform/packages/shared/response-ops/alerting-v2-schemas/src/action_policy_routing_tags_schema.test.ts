/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACTION_POLICY_ROUTING_TAGS_DEFAULT_POLICIES_PER_TAG,
  ACTION_POLICY_ROUTING_TAGS_MAX_POLICIES_PER_TAG,
  ACTION_POLICY_ROUTING_TAGS_SEARCH_MAX_LENGTH,
  actionPolicyRoutingTagsParamsSchema,
  actionPolicyRoutingTagsResponseSchema,
} from './action_policy_routing_tags_schema';

describe('actionPolicyRoutingTagsParamsSchema', () => {
  it('defaults policies_per_tag and leaves search unset', () => {
    expect(actionPolicyRoutingTagsParamsSchema.parse({})).toEqual({
      policies_per_tag: ACTION_POLICY_ROUTING_TAGS_DEFAULT_POLICIES_PER_TAG,
    });
  });

  it('coerces a numeric policies_per_tag string', () => {
    expect(
      actionPolicyRoutingTagsParamsSchema.parse({ search: 'rn', policies_per_tag: '7' })
    ).toEqual({ search: 'rn', policies_per_tag: 7 });
  });

  it.each([1, ACTION_POLICY_ROUTING_TAGS_MAX_POLICIES_PER_TAG])(
    'accepts policies_per_tag %p',
    (value) => {
      expect(
        actionPolicyRoutingTagsParamsSchema.safeParse({ policies_per_tag: value }).success
      ).toBe(true);
    }
  );

  it.each([0, -1, 1.5, 'abc', ACTION_POLICY_ROUTING_TAGS_MAX_POLICIES_PER_TAG + 1])(
    'rejects policies_per_tag %p',
    (value) => {
      expect(
        actionPolicyRoutingTagsParamsSchema.safeParse({ policies_per_tag: value }).success
      ).toBe(false);
    }
  );

  it('bounds search', () => {
    const atLimit = 'a'.repeat(ACTION_POLICY_ROUTING_TAGS_SEARCH_MAX_LENGTH);

    expect(actionPolicyRoutingTagsParamsSchema.safeParse({ search: atLimit }).success).toBe(true);
    expect(actionPolicyRoutingTagsParamsSchema.safeParse({ search: `${atLimit}a` }).success).toBe(
      false
    );
  });

  it('rejects unknown parameters', () => {
    expect(actionPolicyRoutingTagsParamsSchema.safeParse({ page: 1 }).success).toBe(false);
  });
});

describe('actionPolicyRoutingTagsResponseSchema', () => {
  it('accepts a valid response', () => {
    const response = {
      items: [{ tag: 'rna', policy_count: 7, policies: [{ id: 'policy-1', name: 'Policy 1' }] }],
      total_tags: 37,
      is_truncated: false,
    };

    expect(actionPolicyRoutingTagsResponseSchema.parse(response)).toEqual(response);
  });

  it('accepts an empty response', () => {
    expect(
      actionPolicyRoutingTagsResponseSchema.safeParse({
        items: [],
        total_tags: 0,
        is_truncated: false,
      }).success
    ).toBe(true);
  });
});
