/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import {
  SecretAlreadyExistsError,
  SecretConflictError,
  SecretNotFoundError,
  SecretsUnavailableError,
  SecretUndecryptableError,
  SecretValidationError,
} from '@kbn/secrets';
import { toSecretsErrorResponse } from './secrets_error_response';

describe('toSecretsErrorResponse', () => {
  it.each([
    [new SecretValidationError('A secret value has between 8 and 16384 characters'), 400],
    [new SecretNotFoundError('github_token'), 404],
    [new SecretAlreadyExistsError('github_token'), 409],
    [new SecretConflictError('github_token'), 409],
    [new SecretUndecryptableError('github_token'), 409],
    [new SecretsUnavailableError('Set xpack.encryptedSavedObjects.encryptionKey'), 503],
  ])('answers %p with %i and its message', (error, status) => {
    const response = toSecretsErrorResponse({ response: kibanaResponseFactory, error });

    expect(response.status).toBe(status);
    expect(response.payload).toEqual({ message: error.message });
  });
});
