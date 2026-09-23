/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import {
  SandboxSecretsConflictError,
  SandboxSecretsDisabledError,
  SandboxSecretsUnavailableError,
  SandboxSecretsValidationError,
} from '../sandbox_secrets';
import { rethrowSandboxSecretsError } from './sandbox_secrets';

const statusOf = (error: unknown): number | undefined => {
  try {
    rethrowSandboxSecretsError(error);
  } catch (thrown) {
    return isBoom(thrown) ? thrown.output.statusCode : undefined;
  }
};

describe('rethrowSandboxSecretsError', () => {
  it('maps validation errors to 400', () => {
    expect(statusOf(new SandboxSecretsValidationError('bad key'))).toBe(400);
  });

  it('maps missing encryption to 400', () => {
    expect(statusOf(new SandboxSecretsUnavailableError())).toBe(400);
  });

  it('maps version conflicts to 409', () => {
    expect(statusOf(new SandboxSecretsConflictError())).toBe(409);
  });

  it('maps a disabled Nightshift to 404', () => {
    expect(statusOf(new SandboxSecretsDisabledError())).toBe(404);
  });

  it('rethrows unknown errors unchanged', () => {
    const error = new Error('unexpected');
    expect(() => rethrowSandboxSecretsError(error)).toThrow(error);
  });
});
