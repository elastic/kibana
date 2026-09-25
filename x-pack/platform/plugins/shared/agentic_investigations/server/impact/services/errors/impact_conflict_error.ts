/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when concurrent attaches keep winning the version check until retries run out. */
export class ImpactConflictError extends Error {
  constructor(conversationId: string) {
    super(`Impact for conversation ${conversationId} was modified concurrently`);
    this.name = 'ImpactConflictError';
  }
}
