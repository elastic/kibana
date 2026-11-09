/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Raised when the head revision moved between reading it and appending the next one — another
 * reviewer transitioned the same improvement concurrently. Routes surface this as a 409.
 */
export class ImprovementConflictError extends Error {
  constructor(improvementIds: string[]) {
    super(
      `Improvement(s) '${improvementIds.join(
        "', '"
      )}' were modified concurrently; re-read and retry`
    );
    this.name = 'ImprovementConflictError';
  }
}
