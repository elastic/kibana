/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { Alert } from '../alert';
import { getEarlyRecoveredAlerts, trimRecoveredAlerts } from './trim_recovered_alerts';

describe('trimRecoveredAlerts', () => {
  const logger = loggingSystemMock.createLogger();

  const alert1 = new Alert('1', { meta: { flappingHistory: [true, true, true, true] } });
  const alert2 = new Alert('2', { meta: { flappingHistory: new Array(20).fill(false) } });
  const alert3 = new Alert('3', { meta: { flappingHistory: [true, true] } });
  const alert4 = {
    key: '4',
    flappingHistory: [true, true, true, true],
  };
  const alert5 = {
    key: '5',
    flappingHistory: new Array(20).fill(false),
  };
  const alert6 = {
    key: '6',
    flappingHistory: [true, true],
  };

  test('should remove longest recovered alerts', () => {
    const recoveredAlerts = {
      '1': alert1,
      '2': alert2,
      '3': alert3,
    };

    const trimmedAlerts = trimRecoveredAlerts(logger, recoveredAlerts, 2);
    expect(trimmedAlerts).toEqual({
      trimmedAlertsRecovered: { 1: alert1, 3: alert3 },
      earlyRecoveredAlerts: {
        2: new Alert('2', {
          meta: {
            flappingHistory: new Array(20).fill(false),
            flapping: false,
            uuid: expect.any(String),
          },
        }),
      },
    });
  });

  test('should not remove alerts if the num of recovered alerts is not at the limit', () => {
    const recoveredAlerts = {
      '1': alert1,
      '2': alert2,
      '3': alert3,
    };

    const trimmedAlerts = trimRecoveredAlerts(logger, recoveredAlerts, 3);
    expect(trimmedAlerts).toEqual({
      trimmedAlertsRecovered: recoveredAlerts,
      earlyRecoveredAlerts: {},
    });
  });

  test('getEarlyRecoveredAlerts should return longest recovered alerts', () => {
    const recoveredAlerts = [alert4, alert5, alert6];
    const trimmedAlerts = getEarlyRecoveredAlerts(logger, recoveredAlerts, 2);
    expect(trimmedAlerts).toEqual([alert5]);

    expect(logger.warn).toBeCalledWith(
      'Recovered alerts have exceeded the max alert limit of 2 : dropping 1 alert.'
    );
  });

  test('getEarlyRecoveredAlerts should not return alerts if the num of recovered alerts is not at the limit', () => {
    const recoveredAlerts = [alert4, alert5];
    const trimmedAlerts = getEarlyRecoveredAlerts(logger, recoveredAlerts, 2);
    expect(trimmedAlerts).toEqual([]);
  });
});
