/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { DEFAULT_FLAPPING_SETTINGS } from '../../../common/rules_settings';
import { Alert } from '../../alert';
import { alertsWithAnyUUID } from '../../test_utils';
import {
  delayRecoveredFlappingAlerts,
  getEarlyRecoveredAlertIds,
} from './delay_recovered_flapping_alerts';

describe('delayRecoveredFlappingAlerts', () => {
  const logger = loggingSystemMock.createLogger();

  test('should set pendingRecoveredCount to zero for all active alerts', () => {
    const alert1 = new Alert('1', {
      meta: { flapping: true, pendingRecoveredCount: 3, uuid: 'uuid-1' },
    });
    const alert2 = new Alert('2', { meta: { flapping: false, uuid: 'uuid-2' } });

    const { newAlerts, activeAlerts, trackedActiveAlerts } = delayRecoveredFlappingAlerts(
      logger,
      DEFAULT_FLAPPING_SETTINGS,
      'default',
      1000,
      {
        // new alerts
        '1': alert1,
      },
      {
        // active alerts
        '1': alert1,
        '2': alert2,
      },
      {
        // tracked active alerts
        '1': alert1,
        '2': alert2,
      },
      {}, // recovered alerts
      {} // tracked recovered alerts
    );
    expect(newAlerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
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
    expect(trackedActiveAlerts).toMatchInlineSnapshot(`
          Object {
            "1": Object {
              "meta": Object {
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
      trackedActiveAlerts,
      recoveredAlerts,
      trackedRecoveredAlerts,
    } = delayRecoveredFlappingAlerts(
      logger,
      DEFAULT_FLAPPING_SETTINGS,
      'default',
      1000,
      {}, // new alerts
      {}, // active alerts
      {}, // tracked active alerts
      {
        // recovered alerts
        '1': alert1,
        '2': alert2,
        '3': alert3,
      },
      {
        // tracked recovered alerts
        '1': alert1,
        '2': alert2,
        '3': alert3,
      }
    );

    expect(alertsWithAnyUUID(newAlerts)).toMatchInlineSnapshot(`Object {}`);
    expect(alertsWithAnyUUID(trackedActiveAlerts)).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
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
    expect(Object.values(trackedActiveAlerts).map((a) => a.getScheduledActionOptions()))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "actionGroup": "default",
          "context": Object {},
          "state": Object {},
        },
      ]
    `);
    expect(alertsWithAnyUUID(activeAlerts)).toMatchInlineSnapshot(`
      Object {
        "3": Object {
          "meta": Object {
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
    expect(alertsWithAnyUUID(trackedRecoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
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
            "flapping": false,
            "flappingHistory": Array [],
            "maintenanceWindowIds": Array [],
            "uuid": Any<String>,
          },
          "state": Object {},
        },
      }
    `);
    expect(alertsWithAnyUUID(recoveredAlerts)).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
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

  describe('getEarlyRecoveredAlertIds', () => {
    const alert1 = new Alert('1', { meta: { flappingHistory: [true, true, true, true] } });
    const alert2 = new Alert('2', { meta: { flappingHistory: new Array(20).fill(false) } });
    const alert3 = new Alert('3', { meta: { flappingHistory: [true, true] } });

    test('should remove longest recovered alerts', () => {
      const { recoveredAlerts, trackedRecoveredAlerts } = delayRecoveredFlappingAlerts(
        logger,
        DEFAULT_FLAPPING_SETTINGS,
        'default',
        2,
        {}, // new alerts
        {}, // active alerts
        {}, // tracked active alerts
        {
          // recovered alerts
          '1': alert1,
          '2': alert2,
          '3': alert3,
        },
        {
          // tracked recovered alerts
          '1': alert1,
          '2': alert2,
          '3': alert3,
        }
      );
      expect(Object.keys(recoveredAlerts).length).toBe(3);
      expect(recoveredAlerts['2'].getFlapping()).toBe(false);
      expect(Object.keys(trackedRecoveredAlerts).length).toBe(2);
    });

    test('should not remove alerts if the num of recovered alerts is not at the limit', () => {
      const { recoveredAlerts, trackedRecoveredAlerts } = delayRecoveredFlappingAlerts(
        logger,
        DEFAULT_FLAPPING_SETTINGS,
        'default',
        3,
        {}, // new alerts
        {}, // active alerts
        {}, // tracked active alerts
        {
          // recovered alerts
          '1': alert1,
          '2': alert2,
          '3': alert3,
        },
        {
          // tracked recovered alerts
          '1': alert1,
          '2': alert2,
          '3': alert3,
        }
      );
      expect(Object.keys(recoveredAlerts).length).toBe(3);
      expect(recoveredAlerts['2'].getFlapping()).toBe(false);
      expect(Object.keys(trackedRecoveredAlerts).length).toBe(3);
    });

    test('getEarlyRecoveredAlertIds should return longest recovered alerts', () => {
      const alertIds = getEarlyRecoveredAlertIds(
        logger,
        {
          // tracked recovered alerts
          '1': alert1,
          '2': alert2,
          '3': alert3,
        },
        2
      );
      expect(alertIds).toEqual(['2']);

      expect(logger.warn).toBeCalledWith(
        'Recovered alerts have exceeded the max alert limit of 2 : dropping 1 alert.'
      );
    });

    test('getEarlyRecoveredAlertIds should not return alerts if the num of recovered alerts is not at the limit', () => {
      const trimmedAlerts = getEarlyRecoveredAlertIds(
        logger,
        {
          // tracked recovered alerts
          '1': alert1,
          '2': alert2,
        },
        2
      );
      expect(trimmedAlerts).toEqual([]);
    });
  });
});
