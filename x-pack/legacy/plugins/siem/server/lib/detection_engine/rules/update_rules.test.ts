/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { calculateInterval, calculateName, calculateVersion } from './update_rules';

describe('update_rules', () => {
  describe('#calculateInterval', () => {
    test('given a undefined interval, it returns the ruleInterval ', () => {
      const interval = calculateInterval(undefined, '10m');
      expect(interval).toEqual('10m');
    });

    test('given a undefined ruleInterval, it returns a undefined interval ', () => {
      const interval = calculateInterval('10m', undefined);
      expect(interval).toEqual('10m');
    });

    test('given both an undefined ruleInterval and a undefined interval, it returns 5m', () => {
      const interval = calculateInterval(undefined, undefined);
      expect(interval).toEqual('5m');
    });
  });

  describe('#calculateVersion', () => {
    test('given preVersion and nextVersion numbers being null it will return a 1', () => {
      expect(calculateVersion(null, null)).toEqual(1);
    });

    test('given preVersion and nextVersion numbers being undefined it will return a 1', () => {
      expect(calculateVersion(undefined, undefined)).toEqual(1);
    });

    test('given prevVersion as null and nextVersion being defined, nextVersion will be returned', () => {
      expect(calculateVersion(undefined, 5)).toEqual(5);
    });

    test('given prevVersion as being defined but nextVersion is not, prevVersion will be incremented by 1', () => {
      expect(calculateVersion(5, undefined)).toEqual(6);
    });
  });

  describe('#calculateName', () => {
    test('should return the updated name when it and originalName is there', () => {
      const name = calculateName({ updatedName: 'updated', originalName: 'original' });
      expect(name).toEqual('updated');
    });

    test('should return the updated name when originalName is undefined', () => {
      const name = calculateName({ updatedName: 'updated', originalName: undefined });
      expect(name).toEqual('updated');
    });

    test('should return the original name when updatedName is undefined', () => {
      const name = calculateName({ updatedName: undefined, originalName: 'original' });
      expect(name).toEqual('original');
    });

    test('should return untitled when both updatedName and originalName is undefined', () => {
      const name = calculateName({ updatedName: undefined, originalName: undefined });
      expect(name).toEqual('untitled');
    });
  });
});
