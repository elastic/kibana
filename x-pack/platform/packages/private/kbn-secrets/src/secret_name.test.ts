/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECRET_NAME_MAX_LENGTH } from './constants';
import { isValidSecretName } from './secret_name';

describe('isValidSecretName', () => {
  it.each([
    ['a lowercase word', 'token'],
    ['words joined by underscores', 'github_api_token'],
    ['digits after the first character', 'token_2'],
    ['a leading underscore', '_token'],
    ['the maximum length', 'a'.repeat(SECRET_NAME_MAX_LENGTH)],
  ])('accepts %s', (_, name) => {
    expect(isValidSecretName(name)).toBe(true);
  });

  it.each([
    ['an empty name', ''],
    ['an uppercase letter', 'Token'],
    ['a leading digit', '2token'],
    ['a hyphen', 'api-token'],
    ['a dot', 'api.token'],
    ['a space', 'api token'],
    ['a non-ASCII letter', 'tökèn'],
    ['a name over the maximum length', 'a'.repeat(SECRET_NAME_MAX_LENGTH + 1)],
  ])('refuses %s', (_, name) => {
    expect(isValidSecretName(name)).toBe(false);
  });
});
