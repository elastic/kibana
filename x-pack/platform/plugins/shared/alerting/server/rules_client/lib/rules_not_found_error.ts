/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown by checkAuthorizationAndGetTotal when the requested rules genuinely do not exist
 * (as opposed to existing but being hidden from the caller by authorization filters).
 * Callers can use `instanceof RulesNotFoundError` to distinguish this case from
 * `RulesNotVisibleError`, which indicates the rules exist but are not visible to the user.
 */
export class RulesNotFoundError extends Error {
  constructor(label: string) {
    super(`No rules found for bulk ${label}`);
    this.name = 'RulesNotFoundError';
  }
}
