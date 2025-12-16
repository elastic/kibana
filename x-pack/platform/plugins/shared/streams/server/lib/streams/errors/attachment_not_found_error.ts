/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from './status_error';

/**
 * Error thrown when an attachment (dashboard, rule, etc.) is not found in the current space.
 * This represents the actual entity not existing or not being accessible.
 */
export class AttachmentNotFoundError extends StatusError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'AttachmentNotFoundError';
  }
}
