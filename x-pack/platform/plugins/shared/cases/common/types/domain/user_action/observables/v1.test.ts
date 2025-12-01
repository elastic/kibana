/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { ObservablesUserActionPayloadRt, ObservablesUserActionRt } from './v1';

describe('Observables', () => {
  describe('ObservablesUserActionPayloadRt', () => {
    const defaultRequest = {
      observables: {
        count: 1,
        actionType: 'add',
      },
    };

    it('has expected attributes in request', () => {
      const query = ObservablesUserActionPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ObservablesUserActionPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from observables', () => {
      const query = ObservablesUserActionPayloadRt.decode({
        observables: { ...defaultRequest.observables, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
  describe('ObservablesUserActionRt', () => {
    const defaultRequest = {
      type: UserActionTypes.observables,
      payload: {
        observables: {
          count: 1,
          actionType: 'add',
        },
      },
    };

    it('has expected attributes in request', () => {
      const query = ObservablesUserActionRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ObservablesUserActionRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = ObservablesUserActionRt.decode({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
