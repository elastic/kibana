/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when the set of pending proposals (or open linked investigations for an
 * escalation) changed between when the user opened the close dialog and when they
 * confirmed. Maps to HTTP 409 so clients can show the updated list and ask again.
 */
export class CloseTargetsChangedError extends Error {
  readonly code = 'close_targets_changed';

  constructor(detail: string) {
    super(`Close targets changed: ${detail}`);
    this.name = 'CloseTargetsChangedError';
  }
}
