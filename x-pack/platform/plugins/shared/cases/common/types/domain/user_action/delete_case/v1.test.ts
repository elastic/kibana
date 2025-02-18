/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { DeleteCaseUserActionRt } from './v1';

describe('Delete_case', () => {
  describe('DeleteCaseUserActionRt', () => {
    const defaultRequest = {
      type: UserActionTypes.delete_case,
      payload: {},
    };

    it('has expected attributes in request', () => {
      const query = DeleteCaseUserActionRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = DeleteCaseUserActionRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = DeleteCaseUserActionRt.decode({ ...defaultRequest, payload: { foo: 'bar' } });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
