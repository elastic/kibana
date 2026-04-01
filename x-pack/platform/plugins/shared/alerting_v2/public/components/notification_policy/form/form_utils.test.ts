/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SUPPRESSION_MECHANISMS } from './constants';
import { toCreatePayload, toUpdatePayload } from './form_utils';
import type { NotificationPolicyFormState } from './types';

describe('notification policy form utils', () => {
  const state = (): NotificationPolicyFormState => ({
    name: 'Policy',
    description: 'Description',
    matcher: '',
    groupBy: [],
    dispatchPer: 'episode',
    frequency: { type: 'episode_every_evaluation' },
    destinations: [{ type: 'workflow', id: 'workflow-1' }],
    suppressionMechanisms: DEFAULT_SUPPRESSION_MECHANISMS,
  });

  it('omits empty nullable fields from create payloads', () => {
    expect(toCreatePayload(state())).toEqual({
      name: 'Policy',
      description: 'Description',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
  });

  it('sends explicit null values for cleared nullable fields in update payloads', () => {
    expect(toUpdatePayload(state(), 'WzEsMV0=')).toEqual({
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
          ...state(),
          matcher: 'event.severity: critical',
          groupBy: ['host.name'],
          dispatchPer: 'group',
          frequency: { type: 'group_throttle', repeatValue: 5, repeatUnit: 'm' },
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

  it('maps episode repeat frequency to throttle interval', () => {
    expect(
      toCreatePayload({
        ...state(),
        frequency: {
          type: 'episode_status_change_repeat',
          repeatValue: 15,
          repeatUnit: 'm',
        },
      })
    ).toEqual({
      name: 'Policy',
      description: 'Description',
      throttle: { interval: '15m' },
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
  });
});
