/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isKqlQueryValid } from './query_helpers';

describe('Query Helpers', () => {
  describe('isKqlQueryValid', () => {
    it('returns true when KQL is valid', () => {
      const validKql = 'body.text:darkness and response:200';
      expect(isKqlQueryValid(validKql)).toBe(true);
    });

    it('returns false when KQL is undefined', () => {
      expect(isKqlQueryValid(undefined)).toBe(false);
    });

    it('returns false when KQL is invalid', () => {
      expect(isKqlQueryValid('something:"invalid"*')).toBe(false);
    });
  });
});
