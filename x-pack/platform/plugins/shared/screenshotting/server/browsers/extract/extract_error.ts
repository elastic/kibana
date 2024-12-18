/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ExtractError extends Error {
  public readonly cause: Error;

  constructor(cause: Error, message = 'Failed to extract the browser archive') {
    super(message);
    this.message = message;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.cause = cause;
  }
}
