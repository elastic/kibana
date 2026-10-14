/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { WorkflowServiceContract } from './workflow_service';

export const WorkflowServiceToken = createToken<WorkflowServiceContract>(
  'alerting_v2.WorkflowService'
);
