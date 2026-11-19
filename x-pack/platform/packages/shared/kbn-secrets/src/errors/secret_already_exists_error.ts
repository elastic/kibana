/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A secret with this name, compared regardless of case, already exists in the space. */
export class SecretAlreadyExistsError extends Error {
  constructor(public readonly secretName: string) {
    super(`A secret named "${secretName}" already exists`);
    this.name = 'SecretAlreadyExistsError';
  }
}
