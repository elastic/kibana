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
interface PushableCase {
  id: string;
  connector: {
    id: string;
  };
}

export const normalizeCaseStepUpdatesForBulkPatch = (updates: WorkflowUpdatePayload) => {
  const { assignees, connector, ...restUpdates } = updates;

  return {
    ...restUpdates,
    ...(assignees ? { assignees } : {}),
    ...(connector ? { connector } : {}),
  };
};

export async function getCasesClientFromStepsContext(
  context: StepHandlerContext,
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
): Promise<CasesClient> {
  // Get the fake request from the workflow context
  const request = context.contextManager.getFakeRequest();
  return getCasesClient(request);
}

export const createCaseIdOnError =
  <TInput extends { case_id: string }, TConfig = unknown>(
    messageFactory: (caseId: string, error: any) => string
  ) =>
  (_error: unknown, input: TInput, _config: TConfig) =>
    new Error(messageFactory(input.case_id, _error));

export const withCaseOwner = async <T>(
  client: CasesClient,
  caseId: string,
  operation: (owner: string) => Promise<T>
): Promise<T> => {
  const theCase = await client.cases.get({
    id: caseId,
    includeComments: false,
  });

  return operation(theCase.owner);
};

export const pushCase = async (casesClient: CasesClient, theCase: PushableCase) =>
  casesClient.cases.push({
    caseId: theCase.id,
    connectorId: theCase.connector.id,
    pushType: 'automatic',
  });

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return String(error);
};

/**
 * Creates a standardized handler for cases workflow steps.
 */
export function createCasesStepHandler<
  TInput = unknown,
  TConfig = unknown,
  TOutputCase extends WorkflowStepCaseResult = WorkflowStepCaseResult
>(
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>,
  operation: (client: CasesClient, input: TInput, config: TConfig) => Promise<TOutputCase>,
  options?: {
    onError?: (error: unknown, input: TInput, config: TConfig) => Error;
  }
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
        await pushCase(casesClient, theCase);
      }

      return {
        output: {
          case: theCase,
        },
      };
    } catch (error) {
      if (options?.onError) {
        return {
          error: options.onError(error, context.input as TInput, context.config as TConfig),
        };
      }

      return { error };
    }
  };
}
