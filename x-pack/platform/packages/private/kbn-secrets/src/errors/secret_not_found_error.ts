/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** No secret with this name exists in the space, or the consumer may not use it. */
export class SecretNotFoundError extends Error {
  constructor(public readonly secretName: string) {
    super(`Secret "${secretName}" not found`);
    this.name = 'SecretNotFoundError';
  }
}
