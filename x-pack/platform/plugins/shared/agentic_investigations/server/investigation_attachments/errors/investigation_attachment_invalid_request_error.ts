/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A caller passed ids or collections outside the bounds the service accepts. */
export class InvestigationAttachmentInvalidRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvestigationAttachmentInvalidRequestError';
  }
}
