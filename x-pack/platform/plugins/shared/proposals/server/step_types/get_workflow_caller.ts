/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowContext } from '@kbn/workflows';
import type { ProposalWorkflowCaller } from '../services/proposals_service';

/**
 * The run a step writes from. `releasedAt` is read from the run's own inputs
 * rather than the step's, so a step cannot claim a mark its run was not started with.
 */
export const getWorkflowCaller = ({
  workflow,
  execution,
  inputs,
}: WorkflowContext): ProposalWorkflowCaller => {
  const releasedAt = inputs?.releasedAt;
  return {
    workflowId: workflow.id,
    executionId: execution.id,
    releasedAt: typeof releasedAt === 'string' ? releasedAt : undefined,
  };
};
