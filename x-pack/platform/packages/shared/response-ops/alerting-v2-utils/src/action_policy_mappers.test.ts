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
      destinations: [],
    });
  });

  it('passes through all provided fields', () => {
    const data: Partial<ActionPolicyAttachmentData> = {
      name: 'My Policy',
      description: 'desc',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
      matcher: { tags: ['prod'] },
      grouping: { mode: 'per_field', fields: ['host.name'] },
      throttle: { strategy: 'time_interval', interval: '5m' },
    };

    const result = attachmentDataToActionPolicyPayload(data);

    expect(result).toEqual({
      name: 'My Policy',
      description: 'desc',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
      matcher: { tags: ['prod'] },
      grouping: { mode: 'per_field', fields: ['host.name'] },
      throttle: { strategy: 'time_interval', interval: '5m' },
    });
  });

  it('scopes to a single rule via a rule.id matcher', () => {
    const data: Partial<ActionPolicyAttachmentData> = {
      name: 'Rule-scoped Policy',
      description: '',
      matcher: { tags: ['critical'] },
      destinations: [{ type: 'workflow', id: 'wf-1' }],
    };

    const result = attachmentDataToActionPolicyPayload(data);

    expect(result.matcher).toEqual({ tags: ['critical'] });
  });

  it.each([{}, { tags: [] }, { expression: '' }])('omits a matcher set to %p', (matcher) => {
    const result = attachmentDataToActionPolicyPayload({
      name: 'Catch-all Policy',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
      matcher,
    });

    expect(result).not.toHaveProperty('matcher');
  });
});
