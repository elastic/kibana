/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawConnectorSchema } from './v4';

const action = {
  actionTypeId: '.abuseipdb',
  name: 'test-action-name',
  isMissingSecrets: false,
  config: {
    baseUrl: 'http://127.0.0.1:8090',
  },
  secrets: JSON.stringify({
    apiKey: 'foo',
  }),
  isPreconfigured: false,
  isSystemAction: false,
};

describe('Raw Connector Schema v4', () => {
  test('validates a document without a spec version', () => {
    expect(rawConnectorSchema.validate(action)).toEqual(action);
  });

  test('validates a pinned spec version', () => {
    const pinned = { ...action, specVersion: '1.0' };
    expect(rawConnectorSchema.validate(pinned)).toEqual(pinned);
  });

  test('rejects a spec version that is not MAJOR.MINOR', () => {
    expect(() => rawConnectorSchema.validate({ ...action, specVersion: '1.0.0' })).toThrow(
      /MAJOR\.MINOR/
    );
    expect(() => rawConnectorSchema.validate({ ...action, specVersion: 'latest' })).toThrow(
      /MAJOR\.MINOR/
    );
  });

  test('rejects a spec version longer than 16 characters', () => {
    expect(() =>
      rawConnectorSchema.validate({ ...action, specVersion: `1.${'0'.repeat(20)}` })
    ).toThrow(/maximum length/);
  });
});
