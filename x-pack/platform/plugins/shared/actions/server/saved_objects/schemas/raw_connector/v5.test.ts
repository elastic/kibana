/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTOR_DESCRIPTION_MAX_LENGTH } from '../../../../common';
import { rawConnectorSchema } from './v5';

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

describe('Raw Connector Schema v5', () => {
  test('validates a document without a description', () => {
    expect(rawConnectorSchema.validate(action)).toEqual(action);
  });

  test('validates a document with a description', () => {
    const withDescription = { ...action, description: 'Use this for the production workspace.' };
    expect(rawConnectorSchema.validate(withDescription)).toEqual(withDescription);
  });

  test('rejects a description that is too long', () => {
    expect(() =>
      rawConnectorSchema.validate({
        ...action,
        description: 'a'.repeat(CONNECTOR_DESCRIPTION_MAX_LENGTH + 1),
      })
    ).toThrow(/description/);
  });
});
