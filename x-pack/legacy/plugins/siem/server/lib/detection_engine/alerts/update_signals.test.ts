/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { calculateInterval } from './update_signals';

describe('update_signals', () => {
  describe('#calculateInterval', () => {
    test('given a undefined interval, it returns the signalInterval ', () => {
      const interval = calculateInterval(undefined, '10m');
      expect(interval).toEqual('10m');
    });

    test('given a undefined signalInterval, it returns a undefined interval ', () => {
      const interval = calculateInterval('10m', undefined);
      expect(interval).toEqual('10m');
    });

    test('given both an undefined signalInterval and a undefined interval, it returns 5m', () => {
      const interval = calculateInterval(undefined, undefined);
      expect(interval).toEqual('5m');
    });
  });
});
