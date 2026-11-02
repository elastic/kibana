/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class AiIndexIdConflictError extends Error {
  constructor(aiIndexId: string) {
    super(
      `AI index '${aiIndexId}' is already registered as a user-owned index and cannot be managed`
    );
    this.name = 'AiIndexIdConflictError';
  }
}
