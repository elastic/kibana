/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventOrigin } from '../event_origin/origin_schemas';
import type { EbtServiceContract } from '../services/ebt_service/ebt_service';
import { createMockEbtService } from '../services/ebt_service/ebt_service.mock';
import {
  ALERT_ACTION_EBT_EVENT_TYPE_BY_ACTION_TYPE,
  REPORTED_ALERT_ACTION_TYPES,
  alertActionTelemetryEvents,
  buildAlertActionAppliedEventData,
  reportAppliedAlertActions,
  type AppliedAlertAction,
} from './alert_action_ebt_event';

const apiUserOrigin: EventOrigin = { actor: 'user', channel: 'api' };

const action = (overrides: Partial<AppliedAlertAction> = {}): AppliedAlertAction => ({
  actionType: 'ack',
  spaceId: 'default',
  ruleId: 'rule-1',
  origin: apiUserOrigin,
  ...overrides,
});

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

  it('records alert_count as a long', () => {
    expect(alertActionTelemetryEvents[0]?.schema.alert_count).toEqual({
      type: 'long',
      _meta: {
        description:
          'Number of successfully applied alerts for this action, space, and rule. A bulk call that spans rules reports one event per rule.',
        optional: false,
      },
    });
  });
});

describe('buildAlertActionAppliedEventData', () => {
  it('projects space id, rule id, origin, and alert count', () => {
    expect(
      buildAlertActionAppliedEventData({
        spaceId: 'default',
        ruleId: 'rule-1',
        origin: apiUserOrigin,
        alertCount: 3,
      })
    ).toEqual({
      space_id: 'default',
      rule_id: 'rule-1',
      origin: { actor: 'user', channel: 'api' },
      alert_count: 3,
    });
  });

  it('omits rule_id when the alert has no rule id', () => {
    const data = buildAlertActionAppliedEventData({
      spaceId: 'default',
      ruleId: null,
      origin: apiUserOrigin,
      alertCount: 1,
    });

    expect(data).toEqual({
      space_id: 'default',
      origin: { actor: 'user', channel: 'api' },
      alert_count: 1,
    });
    expect(data).not.toHaveProperty('rule_id');
  });

  it('keeps origin.app when the origin has one', () => {
    expect(
      buildAlertActionAppliedEventData({
        spaceId: 'default',
        ruleId: 'rule-1',
        origin: { actor: 'user', channel: 'ui', app: 'observability' },
        alertCount: 1,
      }).origin
    ).toEqual({ actor: 'user', channel: 'ui', app: 'observability' });
  });
});

describe('reportAppliedAlertActions', () => {
  let ebtService: jest.Mocked<EbtServiceContract>;

  beforeEach(() => {
    ebtService = createMockEbtService();
  });

  it('reports one event per action type and rule', () => {
    reportAppliedAlertActions(ebtService, [
      action({ actionType: 'ack', ruleId: 'rule-a' }),
      action({ actionType: 'ack', ruleId: 'rule-a' }),
      action({ actionType: 'ack', ruleId: 'rule-b' }),
      action({ actionType: 'snooze', ruleId: 'rule-a' }),
    ]);

    expect(ebtService.reportEvent.mock.calls).toEqual([
      [
        'alerting_v2_alert_ack_action_applied',
        {
          space_id: 'default',
          rule_id: 'rule-a',
          origin: apiUserOrigin,
          alert_count: 2,
        },
      ],
      [
        'alerting_v2_alert_ack_action_applied',
        {
          space_id: 'default',
          rule_id: 'rule-b',
          origin: apiUserOrigin,
          alert_count: 1,
        },
      ],
      [
        'alerting_v2_alert_snooze_action_applied',
        {
          space_id: 'default',
          rule_id: 'rule-a',
          origin: apiUserOrigin,
          alert_count: 1,
        },
      ],
    ]);
  });

  it('counts assign and clear-assignee as one assign event', () => {
    reportAppliedAlertActions(ebtService, [
      action({ actionType: 'assign' }),
      action({ actionType: 'assign' }),
    ]);

    expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
    expect(ebtService.reportEvent).toHaveBeenCalledWith('alerting_v2_alert_assign_action_applied', {
      space_id: 'default',
      rule_id: 'rule-1',
      origin: apiUserOrigin,
      alert_count: 2,
    });
  });

  it('omits rule_id for the group of alerts that have none', () => {
    reportAppliedAlertActions(ebtService, [
      action({ ruleId: 'rule-1' }),
      action({ ruleId: null }),
      action({ ruleId: null }),
    ]);

    expect(ebtService.reportEvent.mock.calls.map((call) => call[1])).toEqual([
      {
        space_id: 'default',
        rule_id: 'rule-1',
        origin: apiUserOrigin,
        alert_count: 1,
      },
      {
        space_id: 'default',
        origin: apiUserOrigin,
        alert_count: 2,
      },
    ]);
  });

  it('does not report an unknown action type', () => {
    reportAppliedAlertActions(ebtService, [
      action({ actionType: 'unknown' }),
      action({ actionType: 'ack' }),
    ]);

    expect(ebtService.reportEvent).toHaveBeenCalledTimes(1);
    expect(ebtService.reportEvent).toHaveBeenCalledWith(
      'alerting_v2_alert_ack_action_applied',
      expect.objectContaining({ alert_count: 1 })
    );
  });

  it('reports one event per space', () => {
    reportAppliedAlertActions(ebtService, [
      action({ spaceId: 'default' }),
      action({ spaceId: 'default' }),
      action({ spaceId: 'space-b' }),
    ]);

    expect(ebtService.reportEvent.mock.calls.map((call) => call[1])).toEqual([
      expect.objectContaining({ space_id: 'default', alert_count: 2 }),
      expect.objectContaining({ space_id: 'space-b', alert_count: 1 }),
    ]);
  });

  it('keeps actions with different origins in separate events', () => {
    const internalOrigin = { actor: 'internal', channel: 'system' } as const;

    reportAppliedAlertActions(ebtService, [action(), action({ origin: internalOrigin })]);

    expect(ebtService.reportEvent.mock.calls.map((call) => call[1])).toEqual([
      expect.objectContaining({ origin: apiUserOrigin, alert_count: 1 }),
      expect.objectContaining({ origin: internalOrigin, alert_count: 1 }),
    ]);
  });
});
