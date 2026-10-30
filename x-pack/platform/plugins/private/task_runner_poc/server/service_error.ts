/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A failed call to the task runner service. `statusCode` is the service's HTTP status, or
 * 0 when there was no response; `code` is the contract's error code, or one of
 * `not_configured`, `unreachable`, `timeout`, `bad_response`.
 */
export class TaskRunnerServiceError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly code: string) {
    super(message);
    this.name = 'TaskRunnerServiceError';
  }
}
