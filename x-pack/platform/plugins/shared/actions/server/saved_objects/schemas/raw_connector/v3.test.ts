/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawConnectorSchema } from './v3';

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

describe('Raw Connector Schema v3', () => {
  test('validates a legacy document without last-saver identity fields', () => {
    expect(rawConnectorSchema.validate(action)).toEqual(action);
  });

  test('validates optional last-saver identity fields', () => {
    const withIdentity = {
      ...action,
      apiKey: 'encoded-key',
      uiamApiKey: 'encoded-uiam',
      uiamApiKeyExternal: false,
    };
    expect(rawConnectorSchema.validate(withIdentity)).toEqual(withIdentity);
  });

  test('allows null encrypted identity fields', () => {
    const withNullIdentity = {
      ...action,
      apiKey: null,
      uiamApiKey: null,
    };
    expect(rawConnectorSchema.validate(withNullIdentity)).toEqual(withNullIdentity);
  });
});
