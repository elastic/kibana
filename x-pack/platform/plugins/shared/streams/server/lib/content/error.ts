/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { StatusError } from '../streams/errors/status_error';

export class InvalidContentPackError extends StatusError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'InvalidContentPackError';
  }
}

export class ContentPackConflictError extends StatusError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ContentPackConflictError';
  }
}

export class ContentPackIncludeError extends StatusError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ContentPackIncludeError';
  }
}
