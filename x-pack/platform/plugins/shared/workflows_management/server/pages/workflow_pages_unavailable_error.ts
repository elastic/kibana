/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A page operation that this deployment cannot run, such as without an encryption key. */
export class WorkflowPagesUnavailableError extends Error {
  constructor(
    message = 'Workflow pages need an encryption key. Set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.'
  ) {
    super(message);
    this.name = 'WorkflowPagesUnavailableError';
  }
}
