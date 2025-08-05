/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregateStatusError } from '../../errors/aggregate_status_error';

export class InvalidStateError extends AggregateStatusError {
  constructor(errors: Error[], message: string) {
    let overallMessage = message;
    if (errors.length > 0) {
      overallMessage += `: ${errors.map((error) => error.message).join(', ')}`;
    }
    super(errors, overallMessage, 400);
    this.name = 'InvalidStateError';
  }
}
