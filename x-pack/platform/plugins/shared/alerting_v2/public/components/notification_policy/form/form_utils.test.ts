/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toCreatePayload, toUpdatePayload } from './form_utils';

describe('notification policy form utils', () => {
  const state = {
    name: 'Policy',
    description: 'Description',
    matcher: '',
    groupBy: [],
    frequency: { type: 'immediate' as const },
    destinations: [{ type: 'workflow' as const, id: 'workflow-1' }],
  };

  it('omits empty nullable fields from create payloads', () => {
    expect(toCreatePayload(state)).toEqual({
      name: 'Policy',
      description: 'Description',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
  });

  it('sends explicit null values for cleared nullable fields in update payloads', () => {
    expect(toUpdatePayload(state, 'WzEsMV0=')).toEqual({
      version: 'WzEsMV0=',
      name: 'Policy',
      description: 'Description',
      matcher: null,
      groupBy: null,
      throttle: null,
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
  });

  it('preserves concrete nullable values in update payloads', () => {
    expect(
      toUpdatePayload(
        {
          ...state,
          matcher: 'event.severity: critical',
          groupBy: ['host.name'],
          frequency: { type: 'throttle', interval: '5m' },
        },
        'WzEsMV0='
      )
    ).toEqual({
      version: 'WzEsMV0=',
      name: 'Policy',
      description: 'Description',
      matcher: 'event.severity: critical',
      groupBy: ['host.name'],
      throttle: { interval: '5m' },
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
  });
});
