/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys, size } from 'lodash';
import { Alert } from '../alert';
import { determineAlertsToReturn } from './determine_alerts_to_return';

describe('determineAlertsToReturn', () => {
  const flapping = new Array(16).fill(false).concat([true, true, true, true]);
  const notFlapping = new Array(20).fill(false);

  describe('determineAlertsToReturn', () => {
    test('should return all active alerts regardless of flapping', () => {
      const activeAlerts = {
        '1': new Alert('1', { meta: { flappingHistory: flapping } }),
        '2': new Alert('2', { meta: { flappingHistory: [false, false] } }),
      };
      const { alertsToReturn } = determineAlertsToReturn(activeAlerts, {});
      expect(size(alertsToReturn)).toEqual(2);
    });

    test('should return all flapping recovered alerts', () => {
      const recoveredAlerts = {
        '1': new Alert('1', { meta: { flappingHistory: flapping } }),
        '2': new Alert('2', { meta: { flappingHistory: notFlapping } }),
      };
      const { recoveredAlertsToReturn } = determineAlertsToReturn({}, recoveredAlerts);
      expect(keys(recoveredAlertsToReturn)).toEqual(['1']);
    });

    test('should return all recovered alerts if the optimization flag is set to false', () => {
      const recoveredAlerts = {
        '1': new Alert('1', { meta: { flappingHistory: flapping } }),
        '2': new Alert('2', { meta: { flappingHistory: notFlapping } }),
      };
      const { recoveredAlertsToReturn } = determineAlertsToReturn({}, recoveredAlerts, false);
      expect(keys(recoveredAlertsToReturn)).toEqual(['1', '2']);
    });
  });
});
