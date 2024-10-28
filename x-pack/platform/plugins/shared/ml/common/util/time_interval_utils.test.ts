/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveMaxTimeInterval } from './time_interval_utils';

describe('ML - time interval utils', () => {
  describe('resolveMaxTimeInterval', () => {
    test('should resolve maximum bucket interval', () => {
      expect(resolveMaxTimeInterval(['15m', '1h', '6h', '90s'])).toBe(21600);
    });
    test('returns undefined for an empty array', () => {
      expect(resolveMaxTimeInterval([])).toBe(undefined);
    });
  });
});
