/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventOrigin } from '../event_origin/origin_schemas';
import {
  ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE,
  REPORTED_ALERT_ACTION_TYPES,
  alertActionTelemetryEvents,
  buildAlertActionAppliedEventData,
} from './alert_action_ebt_event';

const apiUserOrigin: EventOrigin = { actor: 'user', channel: 'api' };

describe('alert action EBT events', () => {
  it('registers one event type per action', () => {
    expect(alertActionTelemetryEvents.map((event) => event.eventType)).toEqual([
      'alerting_v2_alert_ack_action_applied',
      'alerting_v2_alert_unack_action_applied',
      'alerting_v2_alert_assign_action_applied',
      'alerting_v2_alert_tag_action_applied',
      'alerting_v2_alert_activate_action_applied',
      'alerting_v2_alert_deactivate_action_applied',
      'alerting_v2_alert_snooze_action_applied',
      'alerting_v2_alert_unsnooze_action_applied',
    ]);
  });

  it('shares one payload schema across every event type', () => {
    const [first, ...rest] = alertActionTelemetryEvents;
    for (const event of rest) {
      expect(event.schema).toBe(first?.schema);
    }
  });

  it('maps each action type to its event type', () => {
    expect(ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE).toEqual({
      ack: 'alerting_v2_alert_ack_action_applied',
      unack: 'alerting_v2_alert_unack_action_applied',
      assign: 'alerting_v2_alert_assign_action_applied',
      tag: 'alerting_v2_alert_tag_action_applied',
      activate: 'alerting_v2_alert_activate_action_applied',
      deactivate: 'alerting_v2_alert_deactivate_action_applied',
      snooze: 'alerting_v2_alert_snooze_action_applied',
      unsnooze: 'alerting_v2_alert_unsnooze_action_applied',
    });
    expect(REPORTED_ALERT_ACTION_TYPES).toEqual([
      'ack',
      'unack',
      'assign',
      'tag',
      'activate',
      'deactivate',
      'snooze',
      'unsnooze',
    ]);
  });

  it('records space id, optional rule id, and origin', () => {
    expect(Object.keys(alertActionTelemetryEvents[0]?.schema ?? {})).toEqual([
      'space_id',
      'rule_id',
      'origin',
    ]);
  });
});

describe('buildAlertActionAppliedEventData', () => {
  it('projects space id, rule id, and origin', () => {
    expect(
      buildAlertActionAppliedEventData({
        spaceId: 'default',
        ruleId: 'rule-1',
        origin: apiUserOrigin,
      })
    ).toEqual({
      space_id: 'default',
      rule_id: 'rule-1',
      origin: { actor: 'user', channel: 'api' },
    });
  });

  it('omits rule_id when the alert has no rule id', () => {
    const data = buildAlertActionAppliedEventData({
      spaceId: 'default',
      ruleId: null,
      origin: apiUserOrigin,
    });

    expect(data).toEqual({
      space_id: 'default',
      origin: { actor: 'user', channel: 'api' },
    });
    expect(data).not.toHaveProperty('rule_id');
  });

  it('keeps origin.app when the origin has one', () => {
    expect(
      buildAlertActionAppliedEventData({
        spaceId: 'default',
        ruleId: 'rule-1',
        origin: { actor: 'user', channel: 'ui', app: 'observability' },
      }).origin
    ).toEqual({ actor: 'user', channel: 'ui', app: 'observability' });
  });
});
