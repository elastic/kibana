/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { decodeOrThrow, excess } from './runtime_types';

describe('runtime types utils', () => {
  describe('decodeOrThrow', () => {
    it('returns decoded value when input is valid', () => {
      const schema = rt.type({ id: rt.string });

      const result = decodeOrThrow(schema)({ id: 'test-id' });

      expect(result).toEqual({ id: 'test-id' });
    });

    it('throws when input is invalid', () => {
      const schema = rt.type({ id: rt.string });

      expect(() => decodeOrThrow(schema)({ id: 123 })).toThrow();
    });

    it('throws using custom error factory', () => {
      const schema = rt.type({ id: rt.string });
      const createError = (message: string) => new Error(`custom: ${message}`);

      expect(() => decodeOrThrow(schema, createError)({ id: 123 })).toThrow('custom:');
    });
  });

  describe('excess', () => {
    it('throws when extra properties are present', () => {
      const schema = excess(rt.type({ id: rt.string }));

      expect(() => decodeOrThrow(schema)({ id: 'test-id', extra: 'nope' })).toThrow(
        'excess properties'
      );
    });
  });
});
