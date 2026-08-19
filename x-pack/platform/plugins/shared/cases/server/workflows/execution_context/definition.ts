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
  ALERT_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES,
  CASE_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  OBSERVABLE_WORKFLOW_EXECUTION_CONTEXT_TYPE,
  type CasesWorkflowExecutionContextType,
} from '../../../common/workflows/execution_context';
import type { WorkflowOrigin } from '../../../common/types/domain/user_action/workflow/v1';
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

const getRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const findEventEntity = (
  event: Record<string, unknown>,
  property: string,
  id: string
): Record<string, unknown> | undefined => {
  const entities = event[property];
  if (!Array.isArray(entities)) {
    return undefined;
  }

  return entities.map(getRecord).find((entity) => entity?._id === id || entity?.id === id);
};

const buildWorkflowOrigin = (
  executionContext: WorkflowExecutionContext & { type: CasesWorkflowExecutionContextType },
  inputs: Record<string, unknown>
): WorkflowOrigin => {
  const origin: WorkflowOrigin = {
    type: executionContext.type,
    id: executionContext.id,
  };
  const event = getRecord(inputs.event);
  if (!event) {
    return origin;
  }

  if (executionContext.type === ALERT_WORKFLOW_EXECUTION_CONTEXT_TYPE) {
    const alert =
      findEventEntity(event, 'alerts', executionContext.id) ??
      findEventEntity(event, 'alertIds', executionContext.id);
    const index = alert?._index;

    return typeof index === 'string' ? { ...origin, index } : origin;
  }

  if (executionContext.type === OBSERVABLE_WORKFLOW_EXECUTION_CONTEXT_TYPE) {
    const observable = findEventEntity(event, 'observables', executionContext.id);
    const typeKey = observable?.typeKey;
    const value = observable?.value;

    return typeof typeKey === 'string' && typeof value === 'string'
      ? { ...origin, typeKey, value }
      : origin;
  }

  return origin;
};

export const createCasesWorkflowExecutionContextDefinition = (
  type: CasesWorkflowExecutionContextType,
  getCasesClient: GetCasesClient
) =>
  createWorkflowExecutionContextDefinition({
    type,
    onExecutionStarted: async ({
      request,
      executionContext,
      workflow,
      workflowExecutionId,
      inputs,
    }) => {
      const caseId = getCaseId(executionContext);
      const casesClient = await getCasesClient(request);
      await casesClient.userActions.recordWorkflowExecution({
        caseId,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          executionId: workflowExecutionId,
        },
        origin: buildWorkflowOrigin(executionContext, inputs),
      });
    },
  });

export const createCasesWorkflowExecutionContextDefinitions = (getCasesClient: GetCasesClient) =>
  CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES.map((type) =>
    createCasesWorkflowExecutionContextDefinition(type, getCasesClient)
  );
