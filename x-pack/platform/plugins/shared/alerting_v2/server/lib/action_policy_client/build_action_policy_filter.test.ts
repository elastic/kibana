/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildActionPolicySoFilter } from './build_action_policy_filter';

describe('buildActionPolicySoFilter', () => {
  it('returns an empty string unchanged', () => {
    expect(buildActionPolicySoFilter('')).toBe('');
  });

  it.each([
    ['enabled: true', 'alerting_action_policy.attributes.enabled: true'],
    ['name: "my policy"', 'alerting_action_policy.attributes.name: "my policy"'],
    ['description: cpu', 'alerting_action_policy.attributes.description: cpu'],
  ])('maps %s to the saved object attributes path', (apiFilter, soFilter) => {
    expect(buildActionPolicySoFilter(apiFilter)).toBe(soFilter);
  });

  it('maps id to the saved object root path and prefixes the id value', () => {
    expect(buildActionPolicySoFilter('id: "abc-123"')).toBe(
      'alerting_action_policy.id: "alerting_action_policy:abc-123"'
    );
  });

  it('does not prefix wildcard id values', () => {
    expect(buildActionPolicySoFilter('id: *')).toBe('alerting_action_policy.id: *');
  });

  it('handles compound expressions', () => {
    expect(buildActionPolicySoFilter('enabled: true AND NOT name: "legacy"')).toBe(
      '(alerting_action_policy.attributes.enabled: true AND NOT alerting_action_policy.attributes.name: "legacy")'
    );
  });

  it.each([
    'tags: "prod"',
    'destinations: "wf-1"',
    'alerting_action_policy.attributes.enabled: true',
  ])('rejects the non-filterable field in %s', (apiFilter) => {
    expect(() => buildActionPolicySoFilter(apiFilter)).toThrow(
      expect.objectContaining({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 400 }),
        data: expect.objectContaining({
          code: 'INVALID_FILTER_FIELD',
          details: expect.objectContaining({
            allowed_fields: ['id', 'name', 'description', 'enabled'],
          }),
        }),
      })
    );
  });
});
