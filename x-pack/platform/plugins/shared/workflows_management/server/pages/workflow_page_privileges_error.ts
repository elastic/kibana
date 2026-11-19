/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowForbiddenError } from '../api/workflow_forbidden_error';

/** The caller's role lacks the Kibana privileges of a page operation. */
export class WorkflowPagePrivilegesError extends WorkflowForbiddenError {
  constructor(operation: string, privileges: readonly string[]) {
    super(`The page operation [${operation}] needs the privileges [${privileges.join(', ')}]`);
    this.name = 'WorkflowPagePrivilegesError';
  }
}
