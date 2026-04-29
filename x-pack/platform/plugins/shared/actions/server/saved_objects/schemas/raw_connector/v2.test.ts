/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawConnectorSchema } from './v2';

const action = {
  actionTypeId: '12345',
  name: 'test-action-name',
  isMissingSecrets: false,
  config: {
    foo: 'bar',
  },
  secrets: JSON.stringify({
    pass: 'foo',
  }),
  isPreconfigured: false,
  isSystemAction: false,
};

describe('Raw Connector Schema v2', () => {
  describe('authMode attribute', () => {
    test('validates action with authMode "shared"', () => {
      const actionWithSharedAuth = { ...action, authMode: 'shared' as const };
      expect(rawConnectorSchema.validate(actionWithSharedAuth)).toEqual(actionWithSharedAuth);
    });

    test('validates action with authMode "per-user"', () => {
      const actionWithPerUserAuth = { ...action, authMode: 'per-user' as const };
      expect(rawConnectorSchema.validate(actionWithPerUserAuth)).toEqual(actionWithPerUserAuth);
    });

    test('validates action without authMode (optional)', () => {
      expect(rawConnectorSchema.validate(action)).toEqual(action);
    });

    test('rejects invalid authMode value', () => {
      expect(() => rawConnectorSchema.validate({ ...action, authMode: 'invalid' })).toThrow(
        /authMode/
      );
    });
  });
});
