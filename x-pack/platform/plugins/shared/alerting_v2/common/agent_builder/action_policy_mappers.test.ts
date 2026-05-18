/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyAttachmentData } from '@kbn/alerting-v2-schemas';
import { buildActionPolicyPayload } from './action_policy_mappers';

describe('buildActionPolicyPayload', () => {
  it('fills required defaults for empty data', () => {
    const result = buildActionPolicyPayload({});

    expect(result).toEqual({
      name: '',
      description: '',
      type: 'global',
      destinations: [],
    });
  });

  it('passes through all provided fields', () => {
    const data: Partial<ActionPolicyAttachmentData> = {
      name: 'My Policy',
      description: 'desc',
      type: 'global',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
      matcher: 'rule.tags: "prod"',
      groupBy: ['host.name'],
      tags: ['tag1'],
      groupingMode: 'per_field',
      throttle: { strategy: 'time_interval', interval: '5m' },
    };

    const result = buildActionPolicyPayload(data);

    expect(result).toEqual({
      name: 'My Policy',
      description: 'desc',
      type: 'global',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
      matcher: 'rule.tags: "prod"',
      groupBy: ['host.name'],
      tags: ['tag1'],
      groupingMode: 'per_field',
      throttle: { strategy: 'time_interval', interval: '5m' },
    });
  });

  it('includes ruleId for single_rule policies', () => {
    const data: Partial<ActionPolicyAttachmentData> = {
      name: 'Single Rule Policy',
      description: '',
      type: 'single_rule',
      ruleId: 'rule-123',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
    };

    const result = buildActionPolicyPayload(data);

    expect(result.type).toBe('single_rule');
    expect(result.ruleId).toBe('rule-123');
  });

  it('omits ruleId when not present in data', () => {
    const data: Partial<ActionPolicyAttachmentData> = {
      name: 'Global Policy',
      description: '',
      type: 'global',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
    };

    const result = buildActionPolicyPayload(data);

    expect(result.type).toBe('global');
    expect(result).not.toHaveProperty('ruleId');
  });

  it('converts null ruleId to undefined', () => {
    const data: Partial<ActionPolicyAttachmentData> = {
      name: 'Cleared Rule Policy',
      description: '',
      type: 'global',
      ruleId: null,
      destinations: [{ type: 'workflow', id: 'wf-1' }],
    };

    const result = buildActionPolicyPayload(data);

    expect(result.ruleId).toBeUndefined();
  });
});
