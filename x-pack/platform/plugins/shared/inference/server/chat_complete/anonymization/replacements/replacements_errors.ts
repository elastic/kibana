/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ReplacementsNamespaceMismatchError extends Error {
  public readonly statusCode = 409;

  constructor(
    public readonly replacementsId: string,
    public readonly requestedNamespace: string,
    public readonly actualNamespace: string
  ) {
    super(`Replacements namespace mismatch for id "${replacementsId}": access denied`);
    this.name = 'ReplacementsNamespaceMismatchError';
  }
}
