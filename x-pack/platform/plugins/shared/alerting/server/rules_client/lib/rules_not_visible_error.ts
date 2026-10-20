/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown by checkAuthorizationAndGetTotal when the requested rules exist but are hidden
 * from the caller by authorization filters.
 */
export class RulesNotVisibleError extends Error {
  constructor(label: string) {
    super(`No rules found for bulk ${label}`);
    this.name = 'RulesNotVisibleError';
  }
}
