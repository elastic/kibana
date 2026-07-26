/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSslCertPath } from '../../../../../../common/services';

export function validateSslPathInput(value: string): string[] | undefined {
  const err = validateSslCertPath(value);
  return err ? [err] : undefined;
}

// For useSecretInput: skips existing secret references ({ id }), validates plain strings
export function validateSslPathInputSecret(
  value: string | { id: string } | undefined
): string[] | undefined {
  if (!value || typeof value === 'object') return undefined;
  return validateSslPathInput(value);
}

export function validateSslPathsCombo(
  values: string[]
): Array<{ message: string; index: number }> | undefined {
  const errors = values
    .map((v, index) => ({ err: validateSslCertPath(v), index }))
    .filter((x): x is { err: string; index: number } => x.err !== undefined)
    .map(({ err, index }) => ({ message: err, index }));
  return errors.length ? errors : undefined;
}
