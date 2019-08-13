/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decodeRison, isRisonObject, isRegularString } from './rison_helpers';

describe('rison_helpers', () => {
  describe('#decodeRison', () => {
    test('returns null if given a bad value for RISON', () => {
      const expected = decodeRison('some invalid value');
      expect(expected).toEqual(null);
    });

    test('returns a RISON value decoded if sent in an object', () => {
      const expected = decodeRison(
        '(filterQuery:(expression:\'process.name: "process-name-1"\',kind:kuery),queryLocation:hosts.details,type:details)'
      );
      expect(expected).toEqual({
        filterQuery: { expression: 'process.name: "process-name-1"', kind: 'kuery' },
        queryLocation: 'hosts.details',
        type: 'details',
      });
    });
  });

  describe('#isRisonObject', () => {
    test('returns true if an object is sent in', () => {
      expect(isRisonObject({})).toEqual(true);
    });

    test('returns false if a non object is sent in', () => {
      expect(isRisonObject('i am a string')).toEqual(false);
    });
  });

  describe('#isRegularString', () => {
    test('returns true if a string is sent in', () => {
      expect(isRegularString('i am a string')).toEqual(true);
    });

    test('returns false if a non string is sent in', () => {
      expect(isRegularString({})).toEqual(false);
    });
  });
});
