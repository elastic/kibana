/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SECRET_DESCRIPTION_MAX_LENGTH,
  SECRET_VALUE_MAX_LENGTH,
  SECRET_VALUE_MIN_LENGTH,
  SecretValidationError,
} from '@kbn/secrets';
import type { UpdateSecretParams } from '@kbn/secrets';
import { validateSecret } from './validate_secret';

const secret = (overrides: Partial<UpdateSecretParams> = {}): UpdateSecretParams => ({
  name: 'github_token',
  description: 'Token of the release bot',
  value: 'correct-horse-battery-staple',
  ...overrides,
});

describe('validateSecret', () => {
  it.each([
    ['a value of the minimum length', secret({ value: 'v'.repeat(SECRET_VALUE_MIN_LENGTH) })],
    ['a value of the maximum length', secret({ value: 'v'.repeat(SECRET_VALUE_MAX_LENGTH) })],
    [
      'a description of the maximum length',
      secret({ description: 'd'.repeat(SECRET_DESCRIPTION_MAX_LENGTH) }),
    ],
    ['an update without a value', secret({ value: undefined })],
  ])('accepts %s', (_, params) => {
    expect(() => validateSecret(params)).not.toThrow();
  });

  it.each([
    ['an invalid name', secret({ name: 'GitHub-Token' }), /secret name/],
    [
      'a description over the maximum length',
      secret({ description: 'd'.repeat(SECRET_DESCRIPTION_MAX_LENGTH + 1) }),
      /secret description/,
    ],
    [
      'a value under the minimum length',
      secret({ value: 'v'.repeat(SECRET_VALUE_MIN_LENGTH - 1) }),
      /secret value/,
    ],
    [
      'a value over the maximum length',
      secret({ value: 'v'.repeat(SECRET_VALUE_MAX_LENGTH + 1) }),
      /secret value/,
    ],
  ])('refuses %s', (_, params, message) => {
    expect(() => validateSecret(params)).toThrow(SecretValidationError);
    expect(() => validateSecret(params)).toThrow(message);
  });
});
