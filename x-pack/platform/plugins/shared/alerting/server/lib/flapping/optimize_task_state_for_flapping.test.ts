/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { Alert } from '../../alert';
import {
  optimizeTaskStateForFlapping,
  getAlertIdsOverMaxLimit,
} from './optimize_task_state_for_flapping';

describe('optimizeTaskStateForFlapping', () => {
  const logger = loggingSystemMock.createLogger();

  const alert1 = new Alert('1', { meta: { flappingHistory: [true, true, true, true] } });
  const alert2 = new Alert('2', { meta: { flappingHistory: new Array(20).fill(true) } });
  const alert3 = new Alert('3', { meta: { flappingHistory: [true, true] } });
  const alert4 = new Alert('4', {
    meta: { flappingHistory: new Array(16).fill(false).concat([true, true, true, true]) },
  });
  const alert5 = new Alert('5', { meta: { flappingHistory: new Array(20).fill(false) } });

  test('should remove longest recovered alerts', () => {
    const recoveredAlerts = optimizeTaskStateForFlapping(
      logger,
      {
        '1': alert1,
        '2': alert2,
        '3': alert3,
      },
      2
    );

    expect(Object.keys(recoveredAlerts)).toEqual(['1', '3']);
  });

  test('should not remove alerts if the number of recovered alerts is not over the limit', () => {
    const recoveredAlerts = optimizeTaskStateForFlapping(
      logger,
      {
        '1': alert1,
        '2': alert2,
        '3': alert3,
      },
      3
    );
    expect(Object.keys(recoveredAlerts)).toEqual(['1', '2', '3']);
  });

  test('should return all flapping alerts', () => {
    const recoveredAlerts = optimizeTaskStateForFlapping(
      logger,
      {
        '4': alert4,
        '5': alert5,
      },
      1000
    );
    expect(Object.keys(recoveredAlerts)).toEqual(['4']);
  });

  describe('getAlertIdsOverMaxLimit', () => {
    test('getAlertIdsOverMaxLimit should return longest recovered alerts', () => {
      const alertIds = getAlertIdsOverMaxLimit(
        logger,
        {
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

    test('getAlertIdsOverMaxLimit should not return alerts if the num of recovered alerts is not at the limit', () => {
      const trimmedAlerts = getAlertIdsOverMaxLimit(
        logger,
        {
          '1': alert1,
          '2': alert2,
        },
        2
      );
      expect(trimmedAlerts).toEqual([]);
    });
  });
});
