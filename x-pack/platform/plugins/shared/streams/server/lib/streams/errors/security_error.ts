/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from './status_error';

export class SecurityError extends StatusError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, 403);
    this.name = 'SecurityError';
    if (options?.cause) {
      // Attach the cause to the error if provided (ES2022 standard)
      this.cause = options.cause;
    }
  }
}
