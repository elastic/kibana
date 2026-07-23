/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowAnonymizationFailureMode } from '../config';
import type { WorkflowAnonymizationProvider } from '../workflow_anonymization_provider';

export interface WorkflowAnonymizationOptions {
  readonly provider: WorkflowAnonymizationProvider;
  readonly failureMode: WorkflowAnonymizationFailureMode;
}
