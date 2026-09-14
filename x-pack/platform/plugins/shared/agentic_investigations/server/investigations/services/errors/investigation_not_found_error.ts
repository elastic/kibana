/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when an investigation id does not resolve in the caller's space. */
export class InvestigationNotFoundError extends Error {
  constructor(id: string) {
    super(`Investigation [${id}] not found`);
    this.name = 'InvestigationNotFoundError';
  }
}
