/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawConnectorSchema } from './v1';

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

const preconfiguredAction = {
  ...action,
  isPreconfigured: true,
  id: '6789',
  isDeprecated: false,
};

describe('Raw Connector Schema', () => {
  test('valid action', () => {
    expect(rawConnectorSchema.validate(action)).toEqual(action);
  });

  test('valid preconfigured action', () => {
    expect(rawConnectorSchema.validate(preconfiguredAction)).toEqual(preconfiguredAction);
  });

  test('invalid action', () => {
    expect(() => rawConnectorSchema.validate({ ...action, foo: 'bar' })).toThrow(
      '[foo]: definition for this key is missing'
    );
  });

  test('invalid action with missing params', () => {
    const { name, ...actionWithoutName } = action;
    expect(() => rawConnectorSchema.validate(actionWithoutName)).toThrow(
      '[name]: expected value of type [string] but got [undefined]'
    );
  });

  test('invalid preconfigured action', () => {
    expect(() => rawConnectorSchema.validate({ ...preconfiguredAction, foo: '1' })).toThrow(
      '[foo]: definition for this key is missing'
    );
  });
});
