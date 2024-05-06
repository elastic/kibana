/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { DecodeError, decodeSchema } from './schema_utils';

describe('schema_utils', () => {
  describe('decodeSchema', () => {
    const testSchema = rt.strict({ stringField: rt.string });

    it('throws an error when stringField is not present', () => {
      expect(() => decodeSchema(testSchema, { a: 1 })).toThrowErrorMatchingInlineSnapshot(
        `"Invalid value \\"undefined\\" supplied to \\"stringField\\""`
      );
    });

    it('throws an error when stringField is present but excess properties are also present', () => {
      expect(() =>
        decodeSchema(testSchema, { stringField: 'abc', a: 1 })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid keys \\"a\\""`);
    });

    it('does not throw an error when the data matches the schema', () => {
      expect(() => decodeSchema(testSchema, { stringField: 'abc' })).not.toThrow();
    });

    it('throws a DecodeError instance', () => {
      expect(() => decodeSchema(testSchema, { a: 1 })).toThrowError(
        new DecodeError([`Invalid value \"undefined\" supplied to \"stringField\"`])
      );
    });
  });
});
