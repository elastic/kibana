/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { AssigneesUserActionPayloadRt, AssigneesUserActionRt } from './v1';

describe('Assignees', () => {
  describe('AssigneesUserActionPayloadRt', () => {
    const defaultRequest = {
      assignees: [{ uid: '1' }, { uid: '2' }, { uid: '3' }],
    };

    it('has expected attributes in request', () => {
      const query = AssigneesUserActionPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = AssigneesUserActionPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
  describe('AssigneesUserActionRt', () => {
    const defaultRequest = {
      type: UserActionTypes.assignees,
      payload: {
        assignees: [{ uid: '1' }, { uid: '2' }, { uid: '3' }],
      },
    };

    it('has expected attributes in request', () => {
      const query = AssigneesUserActionRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = AssigneesUserActionRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from assignees', () => {
      const query = AssigneesUserActionRt.decode({
        type: UserActionTypes.assignees,
        payload: {
          assignees: [{ uid: '1', foo: 'bar' }, { uid: '2' }, { uid: '3' }],
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          type: UserActionTypes.assignees,
          payload: {
            assignees: [{ uid: '1' }, { uid: '2' }, { uid: '3' }],
          },
        },
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = AssigneesUserActionRt.decode({
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
