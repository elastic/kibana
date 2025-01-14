/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isFlattenCustomField,
  flattenCustomFieldKey,
  deflattenCustomFieldKey,
  stringToInteger,
  stringToIntegerWithDefault,
} from '.';

describe('utils', () => {
  describe('isFlattenCustomField', () => {
    it('returns true if the key is prefixed with cf_', () => {
      expect(isFlattenCustomField('cf_foo')).toBe(true);
    });

    it('returns false if the key is not prefixed with cf_', () => {
      expect(isFlattenCustomField('foo')).toBe(false);
    });
  });

  describe('flattenCustomFieldKey', () => {
    it('flattens a custom field key correctly', () => {
      expect(flattenCustomFieldKey('foo')).toBe('cf_foo');
    });
  });

  describe('deflattenCustomFieldKey', () => {
    it('deflattens a custom field key correctly', () => {
      expect(deflattenCustomFieldKey('cf_foo')).toBe('foo');
    });
  });

  describe('stringToInteger', () => {
    it('converts a number correctly', () => {
      expect(stringToInteger(5)).toBe(5);
    });

    it('converts a string to a number correctly', () => {
      expect(stringToInteger('5')).toBe(5);
    });

    it('returns undefined if the value cannot converted to a number', () => {
      expect(stringToInteger('foo')).toBe(undefined);
    });
  });

  describe('stringToIntegerWithDefault', () => {
    it('converts a string to a number correctly', () => {
      expect(stringToIntegerWithDefault('5', 10)).toBe(5);
    });

    it('sets the default value correctly if the number is zero', () => {
      expect(stringToIntegerWithDefault(0, 10)).toBe(10);
    });

    it('sets the default value correctly if the value is not a number', () => {
      expect(stringToIntegerWithDefault('foo', 10)).toBe(10);
    });
  });
});
