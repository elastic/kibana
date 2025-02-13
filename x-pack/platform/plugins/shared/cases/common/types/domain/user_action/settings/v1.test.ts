/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { SettingsUserActionPayloadRt, SettingsUserActionRt } from './v1';

describe('Settings', () => {
  describe('SettingsUserActionPayloadRt', () => {
    const defaultRequest = {
      settings: { syncAlerts: true },
    };

    it('has expected attributes in request', () => {
      const query = SettingsUserActionPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = SettingsUserActionPayloadRt.decode({
        settings: { syncAlerts: false },
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          settings: { syncAlerts: false },
        },
      });
    });
  });

  describe('SettingsUserActionRt', () => {
    const defaultRequest = {
      type: UserActionTypes.settings,
      payload: {
        settings: { syncAlerts: true },
      },
    };

    it('has expected attributes in request', () => {
      const query = SettingsUserActionRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = SettingsUserActionRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = SettingsUserActionRt.decode({
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
