/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { valueParsers } from './value_parsers';

const { defaultParser, nullableNumberParser, numberParser } = valueParsers;

describe('valueParsers', () => {
  describe('defaultParser', () => {
    it('should return the string as is', () => {
      expect(defaultParser('the-string')).toBe('the-string');
      expect(defaultParser('9')).toBe('9');
      expect(defaultParser('')).toBe('');
    });
  });

  describe('nullableNumberParser', () => {
    it('should return the string as NaN', () => {
      expect(nullableNumberParser('the-string')).toBe(NaN);
    });
    it('should return the string as number', () => {
      expect(nullableNumberParser('9')).toBe(9);
    });
    it('should return the empty string as null', () => {
      expect(nullableNumberParser('')).toBe(null);
    });
  });

  describe('numberParser', () => {
    it('should return the string as NaN', () => {
      expect(numberParser('the-string')).toBe(NaN);
    });
    it('should return the string as number', () => {
      expect(numberParser('9')).toBe(9);
    });
    it('should return the empty string as 0', () => {
      expect(numberParser('')).toBe(NaN);
    });
  });
});
