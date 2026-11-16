/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBackfillActions } from './get_backfill_actions';

const action = {
  uuid: 'action-uuid-1',
  group: 'default',
  id: 'connector-1',
  actionTypeId: '.index',
  params: {},
};

const systemAction = {
  uuid: 'system-action-uuid-1',
  id: 'system-connector-1',
  actionTypeId: '.cases',
  params: {},
};

describe('getBackfillActions', () => {
  test('should return onActiveAlert actions and system actions', () => {
    const activeAlertAction = {
      ...action,
      frequency: { notifyWhen: 'onActiveAlert' as const, summary: false, throttle: null },
    };

    expect(
      getBackfillActions({ actions: [activeAlertAction], systemActions: [systemAction] })
    ).toEqual({ actions: [activeAlertAction, systemAction], hasUnsupportedActions: false });
  });

  test('should exclude actions with frequencies unsupported by backfill', () => {
    const actionGroupChangeAction = {
      ...action,
      frequency: { notifyWhen: 'onActionGroupChange' as const, summary: false, throttle: null },
    };

    expect(getBackfillActions({ actions: [actionGroupChangeAction], systemActions: [] })).toEqual({
      actions: [],
      hasUnsupportedActions: true,
    });
  });

  test('should apply rule-level notifyWhen to actions without frequency', () => {
    expect(
      getBackfillActions({ actions: [action], systemActions: [], notifyWhen: 'onActiveAlert' })
    ).toEqual({
      actions: [
        {
          ...action,
          frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
        },
      ],
      hasUnsupportedActions: false,
    });

    expect(
      getBackfillActions({ actions: [action], systemActions: [], notifyWhen: 'onThrottleInterval' })
    ).toEqual({ actions: [], hasUnsupportedActions: true });
  });

  test('should treat actions without frequency or rule-level notifyWhen as unsupported', () => {
    expect(getBackfillActions({ actions: [action], notifyWhen: null })).toEqual({
      actions: [],
      hasUnsupportedActions: true,
    });
  });
});
