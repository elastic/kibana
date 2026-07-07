/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFirstKeyInObject } from './object_utils';

describe('object_utils', () => {
  describe('getFirstKeyInObject()', () => {
    it('gets the first key in object', () => {
      expect(getFirstKeyInObject({ attribute1: 'value', attribute2: 'value2' })).toBe('attribute1');
    });

    it('returns undefined with invalid argument', () => {
      expect(getFirstKeyInObject(undefined)).toBe(undefined);
      expect(getFirstKeyInObject(null)).toBe(undefined);
      expect(getFirstKeyInObject({})).toBe(undefined);
      expect(getFirstKeyInObject('value')).toBe(undefined);
      expect(getFirstKeyInObject(5)).toBe(undefined);
    });
  });
});
