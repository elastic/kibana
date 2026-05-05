/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateConnectorId } from './validate_connector_id';
import { CONNECTOR_ID_MAX_LENGTH } from '.';

describe('validateConnectorId', () => {
  it('throws when value is empty', () => {
    expect(() => validateConnectorId('')).toThrow('Connector ID is required.');
  });

  it('throws when value exceeds max length', () => {
    const tooLong = 'a'.repeat(CONNECTOR_ID_MAX_LENGTH + 1);
    expect(() => validateConnectorId(tooLong)).toThrow(
      `Connector ID must be ${CONNECTOR_ID_MAX_LENGTH} characters or less`
    );
  });

  it.each([
    ['uppercase letters', 'My-Connector'],
    ['spaces', 'my connector'],
    ['special characters', 'my@connector!'],
    ['underscores', 'my_connector'],
  ])('throws when value contains %s', (_, value) => {
    expect(() => validateConnectorId(value)).toThrow(
      'Connector ID must contain only lowercase letters, numbers, and hyphens.'
    );
  });

  it.each([
    ['a valid lowercase slug', 'my-connector'],
    ['numbers', 'connector-123'],
    ['a value at exactly max length', 'a'.repeat(CONNECTOR_ID_MAX_LENGTH)],
  ])('does not throw for %s', (_, value) => {
    expect(() => validateConnectorId(value)).not.toThrow();
  });
});
