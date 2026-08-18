/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowExecutionContext } from '@kbn/workflows';
import { createWorkflowExecutionContextDefinition } from '@kbn/workflows-extensions/server';
import {
  CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES,
  CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  type CasesWorkflowExecutionContextType,
} from '../../../common/workflows/execution_context';
import type { CasesClient } from '../../client';

type GetCasesClient = (request: KibanaRequest) => Promise<CasesClient>;

const getCaseId = (
  executionContext: WorkflowExecutionContext & { type: CasesWorkflowExecutionContextType }
): string => {
  if (executionContext.type === CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE) {
    return executionContext.id;
  }

  const { parent } = executionContext;
  if (parent?.type !== CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE) {
    throw new Error(
      `Cases workflow execution context "${executionContext.type}" requires a "${CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE}" parent.`
    );
  }

  return parent.id;
};

export const createCasesWorkflowExecutionContextDefinition = (
  type: CasesWorkflowExecutionContextType,
  getCasesClient: GetCasesClient
) =>
  createWorkflowExecutionContextDefinition({
    type,
    onExecutionStarted: async ({ request, executionContext, workflow, workflowExecutionId }) => {
      const caseId = getCaseId(executionContext);
      const casesClient = await getCasesClient(request);
      await casesClient.userActions.recordWorkflowExecution({
        caseId,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          executionId: workflowExecutionId,
        },
        origin: {
          type: executionContext.type,
          id: executionContext.id,
        },
      });
    },
  });

export const createCasesWorkflowExecutionContextDefinitions = (getCasesClient: GetCasesClient) =>
  CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES.map((type) =>
    createCasesWorkflowExecutionContextDefinition(type, getCasesClient)
  );
