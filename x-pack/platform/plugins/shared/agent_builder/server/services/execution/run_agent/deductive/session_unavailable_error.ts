/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeductiveError } from './errors';

/**
 * The session no longer exists or is not accessible (404, 403, 410).
 * Callers should create a fresh session and retry once.
 */
export class DeductiveSessionUnavailableError extends DeductiveError {
  constructor(statusCode: number) {
    const message =
      statusCode === 404
        ? 'session not found'
        : statusCode === 403
        ? 'session not accessible (team mismatch or permission denied)'
        : statusCode === 410
        ? 'session has expired'
        : `server returned status ${statusCode}`;
    super(message, statusCode);
    this.name = 'DeductiveSessionUnavailableError';
  }
}
