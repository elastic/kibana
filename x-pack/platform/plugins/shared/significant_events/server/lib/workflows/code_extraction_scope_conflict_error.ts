/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Raised when a requested extraction scope differs from the active run. */
export class CodeExtractionScopeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CodeExtractionScopeConflictError';
  }
}
