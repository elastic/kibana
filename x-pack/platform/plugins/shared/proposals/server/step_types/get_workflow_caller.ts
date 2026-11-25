/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowContext } from '@kbn/workflows';
import type { ProposalUpdateCaller } from '../services/proposals_service';

/**
 * The run a step writes from, as the step's context reports it. `releasedAt` is
 * read from the run's own inputs rather than the step's, so a step cannot claim a
 * mark its run was not started with. A step test can override every field here.
 */
export const getWorkflowCaller = (
  { workflow, execution, inputs }: WorkflowContext,
  request: KibanaRequest
): ProposalUpdateCaller => {
  const releasedAt = inputs?.releasedAt;
  return {
    workflowId: workflow.id,
    executionId: execution.id,
    request,
    releasedAt: typeof releasedAt === 'string' ? releasedAt : undefined,
    triggeredBy: execution.triggeredBy,
  };
};
