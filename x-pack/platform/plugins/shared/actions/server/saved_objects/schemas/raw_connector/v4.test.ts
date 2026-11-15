/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawConnectorSchema } from './v4';

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

describe('Raw Connector Schema v4', () => {
  test('validates a document without the inbound identity presence flag', () => {
    expect(rawConnectorSchema.validate(action)).toEqual(action);
  });

  test('validates the unencrypted inbound identity presence flag', () => {
    const withPresence = {
      ...action,
      hasInboundEventIdentity: true,
    };
    expect(rawConnectorSchema.validate(withPresence)).toEqual(withPresence);
  });
});
