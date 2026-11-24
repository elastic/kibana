/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowForbiddenError } from '../api/workflow_forbidden_error';

export class WorkflowAccessDeniedError extends WorkflowForbiddenError {
  constructor() {
    super('You do not have access to this workflow.');
  }
}
