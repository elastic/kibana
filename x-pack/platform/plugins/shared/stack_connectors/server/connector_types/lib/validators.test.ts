/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateKeysAllowed, validateRecordMaxKeys } from './validators';

describe('validators', () => {
  describe('validateRecordMaxKeys', () => {
    it('returns undefined if the keys of the record are less than the maximum', () => {
      expect(
        validateRecordMaxKeys({
          record: { foo: 'bar' },
          maxNumberOfFields: 2,
          fieldName: 'myFieldName',
        })
      ).toBeUndefined();
    });

    it('returns an error if the keys of the record are greater than the maximum', () => {
      expect(
        validateRecordMaxKeys({
          record: { foo: 'bar', bar: 'test', test: 'foo' },
          maxNumberOfFields: 2,
          fieldName: 'myFieldName',
        })
      ).toEqual('A maximum of 2 fields in myFieldName can be defined at a time.');
    });
  });

  describe('validateKeysAllowed', () => {
    it('returns undefined if the keys are allowed', () => {
      expect(
        validateKeysAllowed({
          key: 'foo',
          disallowList: ['bar'],
          fieldName: 'myFieldName',
        })
      ).toBeUndefined();
    });

    it('returns an error if the keys are not allowed', () => {
      expect(
        validateKeysAllowed({
          key: 'foo',
          disallowList: ['foo'],
          fieldName: 'myFieldName',
        })
      ).toEqual('The following properties cannot be defined inside myFieldName: foo.');
    });
  });
});
