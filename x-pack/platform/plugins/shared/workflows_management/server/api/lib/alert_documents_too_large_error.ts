/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when the loaded alert documents exceed the caller's `maxBytes` budget. */
export class AlertDocumentsTooLargeError extends Error {
  constructor(
    public readonly limitBytes: number,
    public readonly loadedBytes: number
  ) {
    super(
      `The loaded alert documents exceed the ${limitBytes} byte limit (at least ${loadedBytes} bytes). Load fewer alerts or fewer fields.`
    );
    this.name = 'AlertDocumentsTooLargeError';
  }
}
