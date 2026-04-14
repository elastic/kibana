/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown by `SuiteRunner.startRun()` when a suite run is already in progress.
 * Routes should map this to a 409 Conflict response — it's a client-facing
 * state error, not a server failure. Lives in its own file because the
 * `max-classes-per-file` lint rule forbids co-locating it with SuiteRunner.
 */
export class SuiteRunConflictError extends Error {
  public readonly activeSuiteId: string;
  public readonly activeRunId: string;
  constructor(activeSuiteId: string, activeRunId: string) {
    super(`A suite run is already in progress: ${activeSuiteId} (${activeRunId})`);
    this.name = 'SuiteRunConflictError';
    this.activeSuiteId = activeSuiteId;
    this.activeRunId = activeRunId;
  }
}
