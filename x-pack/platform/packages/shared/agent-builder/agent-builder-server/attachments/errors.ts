/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class AttachmentNotFoundError extends Error {
  constructor(attachmentId: string) {
    super(`Attachment '${attachmentId}' not found`);
    this.name = 'AttachmentNotFoundError';
  }
}

export class AttachmentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentConflictError';
  }
}

export class AttachmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentValidationError';
  }
}
