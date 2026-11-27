/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The stored value no longer decrypts, for example after the encryption key changed. */
export class SecretUndecryptableError extends Error {
  constructor(public readonly secretName: string) {
    super(`Secret "${secretName}" can no longer be decrypted. Replace its value.`);
    this.name = 'SecretUndecryptableError';
  }
}
