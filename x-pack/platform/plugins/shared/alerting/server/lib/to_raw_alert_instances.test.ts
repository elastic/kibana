/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys, size } from 'lodash';
import { Alert } from '../alert';
import { toRawAlertInstances } from './to_raw_alert_instances';

describe('toRawAlertInstances', () => {
  const flapping = new Array(16).fill(false).concat([true, true, true, true]);
  const notFlapping = new Array(20).fill(false);

  describe('toRawAlertInstances', () => {
    test('should return all active alerts', () => {
      const activeAlerts = {
        '1': new Alert('1', { meta: { flappingHistory: flapping } }),
        '2': new Alert('2', { meta: { flappingHistory: [false, false] } }),
      };
      const { rawActiveAlerts } = toRawAlertInstances(activeAlerts, {});
      expect(size(rawActiveAlerts)).toEqual(2);
    });

    test('should return all recovered alerts', () => {
      const recoveredAlerts = {
        '1': new Alert('1', { meta: { flappingHistory: flapping } }),
        '2': new Alert('2', { meta: { flappingHistory: notFlapping } }),
      };
      const { rawRecoveredAlerts } = toRawAlertInstances({}, recoveredAlerts);
      expect(keys(rawRecoveredAlerts)).toEqual(['1', '2']);
    });
  });
});
