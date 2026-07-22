/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyAttachmentData } from '@kbn/alerting-v2-schemas';
import { attachmentDataToActionPolicyPayload } from './action_policy_mappers';

describe('attachmentDataToActionPolicyPayload', () => {
  it('fills required defaults for empty data', () => {
    const result = attachmentDataToActionPolicyPayload({});

    expect(result).toEqual({
      name: '',
      description: '',
      destinations: [],
    });
  });

  it('passes through all provided fields', () => {
    const data: Partial<ActionPolicyAttachmentData> = {
      name: 'My Policy',
      description: 'desc',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
      matcher: 'rule.tags: "prod"',
      groupBy: ['host.name'],
      tags: ['tag1'],
      groupingMode: 'per_field',
      throttle: { strategy: 'time_interval', interval: '5m' },
    };

    const result = attachmentDataToActionPolicyPayload(data);

    expect(result).toEqual({
      name: 'My Policy',
      description: 'desc',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
      matcher: 'rule.tags: "prod"',
      groupBy: ['host.name'],
      tags: ['tag1'],
      groupingMode: 'per_field',
      throttle: { strategy: 'time_interval', interval: '5m' },
    });
  });

  it('scopes to a single rule via a rule.id matcher', () => {
    const data: Partial<ActionPolicyAttachmentData> = {
      name: 'Rule-scoped Policy',
      description: '',
      matcher: 'rule.id: "rule-123"',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
    };

    const result = attachmentDataToActionPolicyPayload(data);

    expect(result.matcher).toBe('rule.id: "rule-123"');
  });
});
