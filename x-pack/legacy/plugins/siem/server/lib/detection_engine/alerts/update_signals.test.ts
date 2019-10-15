/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { calculateInterval, calculateKqlAndFilter } from './update_signals';

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

  describe('#calculateKqlAndFilter', () => {
    test('given a undefined kql filter it returns a null kql', () => {
      const kqlFilter = calculateKqlAndFilter(undefined, {});
      expect(kqlFilter).toEqual({
        filter: {},
        kql: null,
      });
    });

    test('given a undefined filter it returns a null filter', () => {
      const kqlFilter = calculateKqlAndFilter('some kql string', undefined);
      expect(kqlFilter).toEqual({
        filter: null,
        kql: 'some kql string',
      });
    });

    test('given both a undefined filter and undefined kql it returns both as undefined', () => {
      const kqlFilter = calculateKqlAndFilter(undefined, undefined);
      expect(kqlFilter).toEqual({
        filter: undefined,
        kql: undefined,
      });
    });
  });
});
