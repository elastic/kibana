/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_FLAPPING_SETTINGS,
  DISABLE_FLAPPING_SETTINGS,
} from '@kbn/alerting-plugin/common/rules_settings';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { cloneDeep } from 'lodash';
import { getAlertsForNotification } from './get_alerts_for_notification';

describe('getAlertsForNotification', () => {
  const newEventParams = {
    maintenanceWindowIds: ['maintenance-window-id'],
    timestamp: 'timestamp',
  };
  const alert1 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_RECOVERED,
    },
    flapping: true,
    pendingRecoveredCount: 3,
    activeCount: 3,
  };
  const alert2 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_RECOVERED,
    },
    flapping: false,
  };
  const alert3 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_RECOVERED,
    },
    flapping: true,
  };
  const alert4 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_ACTIVE,
    },
    pendingRecoveredCount: 4,
    flappingHistory: [true, true],
  };
  const alert5 = {
    event: {
      'kibana.alert.status': ALERT_STATUS_ACTIVE,
    },
    activeCount: 1,
    pendingRecoveredCount: 0,
    flappingHistory: [],
  };

  test('should set pendingRecoveredCount to zero for all active alerts', () => {
    const trackedEvents = cloneDeep([alert4]);
    const newEvents = cloneDeep([alert5]);
    expect(
      getAlertsForNotification(
        DEFAULT_FLAPPING_SETTINGS,
        0,
        trackedEvents,
        newEvents,
        newEventParams
      )
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "activeCount": 2,
          "event": Object {
            "kibana.alert.consecutive_matches": 2,
            "kibana.alert.status": "active",
          },
          "flappingHistory": Array [],
          "pendingRecoveredCount": 0,
        },
        Object {
          "activeCount": 1,
          "event": Object {
            "kibana.alert.consecutive_matches": 1,
            "kibana.alert.status": "active",
          },
          "flappingHistory": Array [
            true,
            true,
          ],
          "pendingRecoveredCount": 0,
        },
      ]
    `);
  });

  test('should not remove alerts if the num of recovered alerts is not at the limit', () => {
    const trackedEvents = cloneDeep([alert1, alert2, alert3]);
    expect(
      getAlertsForNotification(DEFAULT_FLAPPING_SETTINGS, 0, trackedEvents, [], newEventParams)
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "activeCount": 0,
          "event": Object {
            "kibana.alert.consecutive_matches": 0,
            "kibana.alert.status": "recovered",
          },
          "flapping": true,
          "pendingRecoveredCount": 0,
        },
        Object {
          "activeCount": 0,
          "event": Object {
            "kibana.alert.consecutive_matches": 0,
            "kibana.alert.status": "recovered",
          },
          "flapping": false,
        },
        Object {
          "activeCount": 0,
          "event": Object {
            "event.action": "active",
            "kibana.alert.consecutive_matches": 0,
            "kibana.alert.status": "active",
          },
          "flapping": true,
          "pendingRecoveredCount": 1,
        },
      ]
    `);
  });

  test('should reset counts and not modify alerts if flapping is disabled', () => {
    const trackedEvents = cloneDeep([alert1, alert2, alert3]);
    expect(
      getAlertsForNotification(DISABLE_FLAPPING_SETTINGS, 0, trackedEvents, [], newEventParams)
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "activeCount": 0,
          "event": Object {
            "kibana.alert.consecutive_matches": 0,
            "kibana.alert.status": "recovered",
          },
          "flapping": true,
          "pendingRecoveredCount": 0,
        },
        Object {
          "activeCount": 0,
          "event": Object {
            "kibana.alert.consecutive_matches": 0,
            "kibana.alert.status": "recovered",
          },
          "flapping": false,
          "pendingRecoveredCount": 0,
        },
        Object {
          "activeCount": 0,
          "event": Object {
            "kibana.alert.consecutive_matches": 0,
            "kibana.alert.status": "recovered",
          },
          "flapping": true,
          "pendingRecoveredCount": 0,
        },
      ]
    `);
  });

  test('should increment activeCount for all active alerts', () => {
    const trackedEvents = cloneDeep([alert4]);
    const newEvents = cloneDeep([alert5]);
    expect(
      getAlertsForNotification(
        DEFAULT_FLAPPING_SETTINGS,
        0,
        trackedEvents,
        newEvents,
        newEventParams
      )
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "activeCount": 2,
          "event": Object {
            "kibana.alert.consecutive_matches": 2,
            "kibana.alert.status": "active",
          },
          "flappingHistory": Array [],
          "pendingRecoveredCount": 0,
        },
        Object {
          "activeCount": 1,
          "event": Object {
            "kibana.alert.consecutive_matches": 1,
            "kibana.alert.status": "active",
          },
          "flappingHistory": Array [
            true,
            true,
          ],
          "pendingRecoveredCount": 0,
        },
      ]
    `);
  });

  test('should reset activeCount for all recovered alerts', () => {
    const trackedEvents = cloneDeep([alert1, alert2]);
    expect(
      getAlertsForNotification(DEFAULT_FLAPPING_SETTINGS, 0, trackedEvents, [], newEventParams)
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "activeCount": 0,
          "event": Object {
            "kibana.alert.consecutive_matches": 0,
            "kibana.alert.status": "recovered",
          },
          "flapping": true,
          "pendingRecoveredCount": 0,
        },
        Object {
          "activeCount": 0,
          "event": Object {
            "kibana.alert.consecutive_matches": 0,
            "kibana.alert.status": "recovered",
          },
          "flapping": false,
        },
      ]
    `);
  });

  test('should not return active alerts if the activeCount is less than the rule alertDelay', () => {
    const trackedEvents = cloneDeep([alert4]);
    const newEvents = cloneDeep([alert5]);
    expect(
      getAlertsForNotification(
        DEFAULT_FLAPPING_SETTINGS,
        5,
        trackedEvents,
        newEvents,
        newEventParams
      )
    ).toMatchInlineSnapshot(`Array []`);
  });

  test('should not return recovered alerts if the activeCount is less than the rule alertDelay', () => {
    const trackedEvents = cloneDeep([alert1]);
    expect(
      getAlertsForNotification(DEFAULT_FLAPPING_SETTINGS, 5, trackedEvents, [], newEventParams)
    ).toMatchInlineSnapshot(`Array []`);
  });

  test('should update active alert to look like a new alert if the activeCount is equal to the rule alertDelay', () => {
    const trackedEvents = cloneDeep([alert5]);
    expect(
      getAlertsForNotification(DEFAULT_FLAPPING_SETTINGS, 2, trackedEvents, [], newEventParams)
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "activeCount": 2,
          "event": Object {
            "event.action": "open",
            "kibana.alert.consecutive_matches": 2,
            "kibana.alert.duration.us": 0,
            "kibana.alert.maintenance_window_ids": Array [
              "maintenance-window-id",
            ],
            "kibana.alert.start": "timestamp",
            "kibana.alert.status": "active",
            "kibana.alert.time_range": Object {
              "gte": "timestamp",
            },
          },
          "flappingHistory": Array [],
          "pendingRecoveredCount": 0,
        },
      ]
    `);
  });
});
