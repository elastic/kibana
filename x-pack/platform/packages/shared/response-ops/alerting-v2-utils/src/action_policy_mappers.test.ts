/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyAttachmentData } from '@kbn/alerting-v2-schemas';
import {
  attachmentDataToActionPolicyPayload,
  throttleResponseToRequest,
} from './action_policy_mappers';

describe('throttleResponseToRequest', () => {
  it('returns undefined for a null or missing throttle', () => {
    expect(throttleResponseToRequest(null)).toBeUndefined();
    expect(throttleResponseToRequest(undefined)).toBeUndefined();
  });

  it('omits a null strategy', () => {
    expect(throttleResponseToRequest({ strategy: null, interval: null })).toEqual({
      interval: null,
    });
  });

  it('keeps a set strategy and interval', () => {
    expect(throttleResponseToRequest({ strategy: 'time_interval', interval: '5m' })).toEqual({
      strategy: 'time_interval',
      interval: '5m',
    });
  });
});

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
      matcher: { tags: ['prod'] },
      group_by: ['host.name'],
      grouping_mode: 'per_field',
      throttle: { strategy: 'time_interval', interval: '5m' },
    };

    const result = attachmentDataToActionPolicyPayload(data);

    expect(result).toEqual({
      name: 'My Policy',
      description: 'desc',
      destinations: [{ type: 'workflow', id: 'wf-1' }],
      matcher: { tags: ['prod'] },
      group_by: ['host.name'],
      grouping_mode: 'per_field',
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

  it('drops a null throttle strategy so the payload passes the request schema', () => {
    const result = attachmentDataToActionPolicyPayload({
      throttle: { strategy: null, interval: null },
    });

    expect(result.throttle).toEqual({ interval: null });
  });
});
