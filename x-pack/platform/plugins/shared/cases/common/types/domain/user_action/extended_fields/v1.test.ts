/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import {
  ExtendedFieldsRt,
  ExtendedFieldsUserActionPayloadRt,
  ExtendedFieldsUserActionRt,
} from './v1';

describe('ExtendedFields', () => {
  describe('ExtendedFieldsRt', () => {
    it('accepts a record of string to string', () => {
      expect(ExtendedFieldsRt.decode({ risk_score: 'high', severity: 'medium' })).toStrictEqual({
        _tag: 'Right',
        right: { risk_score: 'high', severity: 'medium' },
      });
    });

    it('rejects a record with non-string values', () => {
      const result = ExtendedFieldsRt.decode({ risk_score: 42 });
      expect(result._tag).toBe('Left');
    });

    it('accepts an empty record', () => {
      expect(ExtendedFieldsRt.decode({})).toStrictEqual({
        _tag: 'Right',
        right: {},
      });
    });
  });

  describe('ExtendedFieldsUserActionPayloadRt', () => {
    const defaultRequest = {
      extended_fields: { risk_score: 'high' },
    };

    it('has expected attributes in request', () => {
      expect(ExtendedFieldsUserActionPayloadRt.decode(defaultRequest)).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      expect(
        ExtendedFieldsUserActionPayloadRt.decode({ ...defaultRequest, foo: 'bar' })
      ).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ExtendedFieldsUserActionRt', () => {
    const defaultRequest = {
      type: UserActionTypes.extended_fields,
      payload: {
        extended_fields: { risk_score: 'high' },
      },
    };

    it('has expected attributes in request', () => {
      expect(ExtendedFieldsUserActionRt.decode(defaultRequest)).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      expect(ExtendedFieldsUserActionRt.decode({ ...defaultRequest, foo: 'bar' })).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      expect(
        ExtendedFieldsUserActionRt.decode({
          ...defaultRequest,
          payload: { ...defaultRequest.payload, foo: 'bar' },
        })
      ).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
