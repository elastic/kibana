/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class AiIndexConflictError extends Error {
  constructor(aiIndexId: string) {
    super(`AI index '${aiIndexId}' was modified concurrently; please retry`);
    this.name = 'AiIndexConflictError';
  }
}
