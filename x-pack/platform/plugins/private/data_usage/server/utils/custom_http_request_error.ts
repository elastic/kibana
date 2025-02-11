/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class CustomHttpRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly meta?: unknown
  ) {
    super(message);
    // For debugging - capture name of subclasses
    this.name = this.constructor.name;

    if (meta instanceof Error) {
      this.stack += `\n----- original error -----\n${meta.stack}`;
    }
  }
}
