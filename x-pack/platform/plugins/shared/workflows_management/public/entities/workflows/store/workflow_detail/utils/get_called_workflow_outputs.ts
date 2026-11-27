/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CalledWorkflowOutputs } from '@kbn/workflows-yaml';
import type { WorkflowsResponse } from '../../../model/types';

/** The outputs of a workflow from the loaded workflows, for the editor's context registry. */
export const getCalledWorkflowOutputs = (
  workflows: WorkflowsResponse | null | undefined,
  workflowId: string
): CalledWorkflowOutputs | undefined => {
  const workflow = workflows?.workflows[workflowId];
  if (!workflow) {
    return undefined;
  }
  const { name, outputs, returnedOutputNames } = workflow;
  return { name, outputs, returnedOutputNames };
};
