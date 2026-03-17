/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { CasesClient } from '../../client';
import type { CreateCaseStepOutput } from '../../../common/workflows/steps/create_case';
import type { UpdateCaseStepInput } from '../../../common/workflows/steps/update_case';

type WorkflowStepCaseResult = CreateCaseStepOutput['case'];
type WorkflowUpdatePayload = UpdateCaseStepInput['updates'];

export const normalizeCaseStepUpdatesForBulkPatch = (updates: WorkflowUpdatePayload) => {
  const { assignees, connector, ...restUpdates } = updates;

  return {
    ...restUpdates,
    ...(assignees ? { assignees } : {}),
    ...(connector ? { connector } : {}),
  };
};

async function getCasesClientFromStepsContext(
  context: StepHandlerContext,
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
): Promise<CasesClient> {
  // Get the fake request from the workflow context
  const request = context.contextManager.getFakeRequest();
  return getCasesClient(request);
}

/**
 * Creates a standardized handler for cases workflow steps.
 */
export function createCasesStepHandler<
  TInput = unknown,
  TConfig = unknown,
  TOutputCase extends WorkflowStepCaseResult = WorkflowStepCaseResult
>(
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>,
  operation: (client: CasesClient, input: TInput, config: TConfig) => Promise<TOutputCase>
) {
  return async (context: StepHandlerContext) => {
    try {
      const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
      const theCase = await operation(
        casesClient,
        context.input as TInput,
        context.config as TConfig
      );

      if (context.config['push-case']) {
        await casesClient.cases.push({
          caseId: theCase.id,
          connectorId: theCase.connector.id,
          pushType: 'automatic',
        });
      }

      return {
        output: {
          case: theCase,
        },
      };
    } catch (error) {
      return { error };
    }
  };
}
