/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from './status_error';

/**
 * Error thrown when attempting to unlink an attachment that exists in a different space.
 * This prevents cross-space manipulation of attachments in multi-tenant environments.
 */
export class AttachmentInDifferentSpaceError extends StatusError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'AttachmentInDifferentSpaceError';
  }
}
