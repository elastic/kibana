/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { AlertAction } from '../../../resources/datastreams/alert_actions';
import type { AlertEventRecord } from '../types';
import { createAuditOnlyHandler } from './audit_only_handler';

const buildAlertEvent = (): AlertEventRecord => ({
  '@timestamp': '2026-06-28T19:00:00.000Z',
  group_hash: 'g-1',
  episode_id: 'e-1',
  rule_id: 'r-1',
  space_id: 'default',
  data_json: {},
});

const buildAlertActionDoc = (): AlertAction => ({
  '@timestamp': '2026-06-28T19:00:00.000Z',
  action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
  episode_id: 'e-1',
  rule_id: 'r-1',
  space_id: 'default',
  group_hash: 'g-1',
  last_series_event_timestamp: '2026-06-28T19:00:00.000Z',
  actor: 'user-1',
});

describe('createAuditOnlyHandler', () => {
  it('uses the supplied action_type as its discriminant', () => {
    const handler = createAuditOnlyHandler(ALERT_EPISODE_ACTION_TYPE.ACK);
    expect(handler.actionType).toBe(ALERT_EPISODE_ACTION_TYPE.ACK);
  });

  it('omits loadContext — audit-only handlers do not preload', () => {
    const handler = createAuditOnlyHandler(ALERT_EPISODE_ACTION_TYPE.SNOOZE);
    expect(handler.loadContext).toBeUndefined();
  });

  it('returns only the precomputed audit doc as the prepared payload', () => {
    const handler = createAuditOnlyHandler(ALERT_EPISODE_ACTION_TYPE.UNACK);
    const alertActionDoc = buildAlertActionDoc();

    const prepared = handler.prepare(
      {
        action: { action_type: ALERT_EPISODE_ACTION_TYPE.UNACK, episode_id: 'e-1' },
        alertEvent: buildAlertEvent(),
      },
      { alertActionDoc, userProfileUid: 'profile-1', context: undefined }
    );

    expect(prepared).toEqual({ alertActionDoc });
  });

  it('does not synthesise a rule event — that is reserved for lifecycle handlers', () => {
    const handler = createAuditOnlyHandler(ALERT_EPISODE_ACTION_TYPE.TAG);

    const prepared = handler.prepare(
      {
        action: { action_type: ALERT_EPISODE_ACTION_TYPE.TAG, tags: ['urgent'] },
        alertEvent: buildAlertEvent(),
      },
      { alertActionDoc: buildAlertActionDoc(), userProfileUid: null, context: undefined }
    );

    expect(prepared.ruleEvent).toBeUndefined();
  });

  it('ignores the alertEvent — audit-only handlers must not depend on event state', () => {
    const handler = createAuditOnlyHandler(ALERT_EPISODE_ACTION_TYPE.ASSIGN);
    const alertActionDoc = buildAlertActionDoc();
    const action = {
      action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
      episode_id: 'e-1',
      assignee_uid: 'user-a',
    } as const;

    const fromEventOne = handler.prepare(
      { action, alertEvent: { ...buildAlertEvent(), '@timestamp': '2026-06-28T19:00:00.000Z' } },
      { alertActionDoc, userProfileUid: null, context: undefined }
    );
    const fromEventTwo = handler.prepare(
      { action, alertEvent: { ...buildAlertEvent(), '@timestamp': '2099-01-01T00:00:00.000Z' } },
      { alertActionDoc, userProfileUid: null, context: undefined }
    );

    expect(fromEventOne).toEqual(fromEventTwo);
  });
});
