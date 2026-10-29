/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionGroup, createAlert } from '../../fixtures/test_utils';
import { toNotifiedActions } from './action_documents';

describe('toNotifiedActions', () => {
  const alertA = createAlert({
    alert_id: 'alert-a',
    group_hash: 'hash-a',
    last_event_timestamp: '2026-01-22T07:10:00.000Z',
    alert_status: 'active',
  });
  const alertB = createAlert({
    alert_id: 'alert-b',
    group_hash: 'hash-b',
    last_event_timestamp: '2026-01-22T07:11:00.000Z',
    alert_status: 'recovering',
  });

  it('returns one notified doc per alert carrying the alert event time', () => {
    const group = createActionGroup({
      id: 'group-1',
      policyId: 'policy-1',
      alerts: [alertA, alertB],
    });

    expect(toNotifiedActions(group, 'per_field')).toEqual([
      {
        actor: { type: 'internal' },
        action_type: 'notified',
        action_group_id: 'group-1',
        alert_id: 'alert-a',
        group_hash: 'hash-a',
        rule_id: 'rule-1',
        source: 'internal',
        space_id: 'default',
        last_series_event_timestamp: '2026-01-22T07:10:00.000Z',
        reason: 'notified by policy policy-1',
      },
      {
        actor: { type: 'internal' },
        action_type: 'notified',
        action_group_id: 'group-1',
        alert_id: 'alert-b',
        group_hash: 'hash-b',
        rule_id: 'rule-1',
        source: 'internal',
        space_id: 'default',
        last_series_event_timestamp: '2026-01-22T07:11:00.000Z',
        reason: 'notified by policy policy-1',
      },
    ]);
  });

  it('sets alert_status only for per_alert grouping', () => {
    const group = createActionGroup({ alerts: [alertA] });

    expect(toNotifiedActions(group, 'per_alert')[0].alert_status).toBe('active');
    expect(toNotifiedActions(group, 'per_field')[0]).not.toHaveProperty('alert_status');
    expect(toNotifiedActions(group, 'all')[0]).not.toHaveProperty('alert_status');
  });

  it('returns no docs for a group without alerts', () => {
    expect(toNotifiedActions(createActionGroup({ alerts: [] }), 'per_alert')).toEqual([]);
  });
});
