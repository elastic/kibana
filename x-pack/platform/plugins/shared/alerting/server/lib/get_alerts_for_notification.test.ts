/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FLAPPING_SETTINGS, DISABLE_FLAPPING_SETTINGS } from '../../common/rules_settings';
import { getAlertsForNotification } from '.';
import { Alert } from '../alert';
import { alertsWithAnyUUID } from '../test_utils';

describe('getAlertsForNotification', () => {
  test('should set pendingRecoveredCount to zero for all active alerts', () => {
    const alert1 = new Alert('1', {
      meta: { flapping: true, pendingRecoveredCount: 3, uuid: 'uuid-1' },
    });
    const alert2 = new Alert('2', { meta: { flapping: false, uuid: 'uuid-2' } });

    const { newAlerts, activeAlerts } = getAlertsForNotification(
      DEFAULT_FLAPPING_SETTINGS,
      'default',
      0,
      {
        // new alerts
        '1': alert1,
      },
      {
        // active alerts
        '1': alert1,
        '2': alert2,
      },
      {},
      {}
    );
    expect(newAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 1,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
      }
    `);
    expect(activeAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 1,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 1,
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should return flapping pending recovered alerts as active alerts and current active alerts', () => {
    const alert1 = new Alert('1', { meta: { flapping: true, pendingRecoveredCount: 3 } });
    const alert2 = new Alert('2', { meta: { flapping: false } });
    const alert3 = new Alert('3', { meta: { flapping: true } });

    const {
      newAlerts,
      activeAlerts,
      currentActiveAlerts,
      recoveredAlerts,
      currentRecoveredAlerts,
    } = getAlertsForNotification(
      DEFAULT_FLAPPING_SETTINGS,
      'default',
      0,
      {},
      {},
      {
        // recovered alerts
        '1': alert1,
        '2': alert2,
        '3': alert3,
      },
      {
        // current recovered alerts
        '1': alert1,
        '2': alert2,
        '3': alert3,
      }
    );

    expect(alertsWithAnyUUID(newAlerts)).toMatchInlineSnapshot(`Object {}`);
    expect(alertsWithAnyUUID(activeAlerts)).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 1,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(Object.values(activeAlerts).map((a) => a.getScheduledActionOptions()))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroup": "default",
          "context": Object {},
          "state": Object {},
        },
      ]
    `);
    expect(alertsWithAnyUUID(currentActiveAlerts)).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 1,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(Object.values(currentActiveAlerts).map((a) => a.getScheduledActionOptions()))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroup": "default",
          "context": Object {},
          "state": Object {},
        },
      ]
  `);
    expect(alertsWithAnyUUID(recoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(alertsWithAnyUUID(currentRecoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should reset counts and not modify alerts if flapping is disabled', () => {
    const alert1 = new Alert('1', {
      meta: { flapping: true, flappingHistory: [true, false, true], pendingRecoveredCount: 3 },
    });
    const alert2 = new Alert('2', {
      meta: { flapping: false, flappingHistory: [true, false, true] },
    });
    const alert3 = new Alert('3', {
      meta: { flapping: true, flappingHistory: [true, false, true] },
    });

    const { newAlerts, activeAlerts, recoveredAlerts, currentRecoveredAlerts } =
      getAlertsForNotification(
        DISABLE_FLAPPING_SETTINGS,
        'default',
        0,
        {},
        {},
        {
          // recovered alerts
          '1': alert1,
          '2': alert2,
          '3': alert3,
        },
        {
          // current recovered alerts
          '1': alert1,
          '2': alert2,
          '3': alert3,
        }
      );

    expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(activeAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(alertsWithAnyUUID(recoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": false,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(alertsWithAnyUUID(currentRecoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": false,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flapping": true,
            "flappingHistory": Array [
              true,
              false,
              true,
            ],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
  });

  test('should increment activeCount for all active alerts', () => {
    const alert1 = new Alert('1', {
      meta: { activeCount: 1, uuid: 'uuid-1' },
    });
    const alert2 = new Alert('2', { meta: { uuid: 'uuid-2' } });

    const { newAlerts, activeAlerts, currentActiveAlerts, delayedAlertsCount } =
      getAlertsForNotification(
        DEFAULT_FLAPPING_SETTINGS,
        'default',
        0,
        {
          // new alerts
          '1': alert1,
        },
        {
          // active alerts
          '1': alert1,
          '2': alert2,
        },
        {},
        {}
      );
    expect(newAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
      }
    `);
    expect(activeAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 1,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
    expect(currentActiveAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 1,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
    expect(delayedAlertsCount).toBe(0);
  });

  test('should reset activeCount for all recovered alerts', () => {
    const alert1 = new Alert('1', { meta: { activeCount: 3 } });
    const alert3 = new Alert('3');

    const { recoveredAlerts, currentRecoveredAlerts, delayedAlertsCount } =
      getAlertsForNotification(
        DEFAULT_FLAPPING_SETTINGS,
        'default',
        0,
        {},
        {},
        {
          // recovered alerts
          '1': alert1,
          '3': alert3,
        },
        {
          // current recovered alerts
          '1': alert1,
          '3': alert3,
        }
      );

    expect(alertsWithAnyUUID(recoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(alertsWithAnyUUID(currentRecoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
        "3": Object {
          "meta": Object {
            "activeCount": 0,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(delayedAlertsCount).toBe(0);
  });

  test('should remove the alert from newAlerts and should not return the alert in currentActiveAlerts if the activeCount is less than the rule alertDelay', () => {
    const alert1 = new Alert('1', {
      meta: { activeCount: 1, uuid: 'uuid-1' },
    });
    const alert2 = new Alert('2', { meta: { uuid: 'uuid-2' } });

    const { newAlerts, activeAlerts, currentActiveAlerts, delayedAlertsCount } =
      getAlertsForNotification(
        DEFAULT_FLAPPING_SETTINGS,
        'default',
        5,
        {
          // new alerts
          '1': alert1,
        },
        {
          // active alerts
          '1': alert1,
          '2': alert2,
        },
        {},
        {}
      );
    expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(activeAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "activeCount": 2,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-1",
          },
          "state": Object {},
        },
        "2": Object {
          "meta": Object {
            "activeCount": 1,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "pendingRecoveredCount": 0,
            "uuid": "uuid-2",
          },
          "state": Object {},
        },
      }
    `);
    expect(currentActiveAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(delayedAlertsCount).toBe(2);
  });

  test('should remove the alert from recoveredAlerts and should not return the alert in currentRecoveredAlerts if the activeCount is less than the rule alertDelay', () => {
    const alert1 = new Alert('1', {
      meta: { activeCount: 1, uuid: 'uuid-1' },
    });
    const alert2 = new Alert('2', { meta: { uuid: 'uuid-2' } });

    const { recoveredAlerts, currentRecoveredAlerts, delayedAlertsCount } =
      getAlertsForNotification(
        DEFAULT_FLAPPING_SETTINGS,
        'default',
        5,
        {},
        {},
        {
          // recovered alerts
          '1': alert1,
          '2': alert2,
        },
        {
          // current recovered alerts
          '1': alert1,
          '2': alert2,
        }
      );
    expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(currentRecoveredAlerts).toMatchInlineSnapshot(`Object {}`);
    expect(delayedAlertsCount).toBe(0);
  });

  test('should update active alert to look like a new alert if the activeCount is equal to the rule alertDelay', () => {
    const alert2 = new Alert('2', { meta: { uuid: 'uuid-2' } });

    const { newAlerts, activeAlerts, currentActiveAlerts, delayedAlertsCount } =
      getAlertsForNotification(
        DEFAULT_FLAPPING_SETTINGS,
        'default',
        1,
        {},
        {
          // active alerts
          '2': alert2,
        },
        {},
        {}
      );
    expect(newAlerts['2'].getState().duration).toBe('0');
    expect(newAlerts['2'].getState().start).toBeTruthy();

    expect(activeAlerts['2'].getState().duration).toBe('0');
    expect(activeAlerts['2'].getState().start).toBeTruthy();

    expect(currentActiveAlerts['2'].getState().duration).toBe('0');
    expect(currentActiveAlerts['2'].getState().start).toBeTruthy();

    expect(delayedAlertsCount).toBe(0);
  });
});
