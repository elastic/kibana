/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The secret changed after it was read, so the write was refused. */
export class SecretConflictError extends Error {
  constructor(public readonly secretName: string) {
    super(`Secret "${secretName}" was changed by another request. Try again.`);
    this.name = 'SecretConflictError';
  }
}
