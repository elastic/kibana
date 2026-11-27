/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown by the `LibraryService` when a request is made while the
 * `workflowsManagement:library:enabled` global uiSetting is `false`. Routes
 * surface this as HTTP 503 — the routes exist, but the feature is gated.
 */
export class LibraryDisabledError extends Error {
  readonly statusCode = 503;
  constructor() {
    super('Workflow Template library is disabled.');
    this.name = 'LibraryDisabledError';
  }
}
