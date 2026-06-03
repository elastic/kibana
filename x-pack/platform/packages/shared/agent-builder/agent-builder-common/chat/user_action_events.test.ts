/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UserActionType,
  createFieldChangedUserActionEvents,
  serializeAuditValue,
} from './user_action_events';
import { TimelineEventType } from './conversation';

const testUser = { id: 'user-1', username: 'analyst_a' };

describe('createFieldChangedUserActionEvents', () => {
  it('returns no events when fields are unchanged', () => {
    const events = createFieldChangedUserActionEvents({
      previousFields: { severity: 'high', status: 'open' },
      nextFields: { severity: 'high', status: 'open' },
      user: testUser,
    });

    expect(events).toEqual([]);
  });

  it('emits one event per changed field', () => {
    const events = createFieldChangedUserActionEvents({
      previousFields: { severity: 'medium', status: 'open' },
      nextFields: { severity: 'high', status: 'in progress' },
      user: testUser,
      timestamp: '2024-01-02T00:00:00.000Z',
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      type: TimelineEventType.user_action,
      action: UserActionType.field_changed,
      user: testUser,
      timestamp: '2024-01-02T00:00:00.000Z',
      payload: { field: 'severity', previous_value: 'medium', new_value: 'high' },
    });
    expect(events[1].payload).toEqual({
      field: 'status',
      previous_value: 'open',
      new_value: 'in progress',
    });
  });

  it('serializes assignee arrays for elasticsearch text mapping', () => {
    const events = createFieldChangedUserActionEvents({
      previousFields: {},
      nextFields: {
        assignees: [{ uid: 'u1', username: 'analyst_a' }],
      },
      user: testUser,
    });

    expect(events).toHaveLength(1);
    expect(events[0].payload.new_value).toBe(
      JSON.stringify([{ uid: 'u1', username: 'analyst_a' }])
    );
    expect(serializeAuditValue('plain')).toBe('plain');
  });
});
