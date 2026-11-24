/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The page does not exist, or the caller cannot see it. */
export class WorkflowPageNotFoundError extends Error {
  constructor(public readonly pageId: string, public readonly workflowId: string) {
    super(`Page '${pageId}' of workflow '${workflowId}' not found`);
    this.name = 'WorkflowPageNotFoundError';
  }
}
