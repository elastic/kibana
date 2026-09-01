/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { ActionSource } from '../../../common/types/domain';
import { ActionSourceTypes, isActionSource, toActionSource } from '../../../common/types/domain';
import type { CasesClient } from '../../client';
import type { GetCasesClientFn } from '../../client/types';
import { ACTION_SOURCE_STEP_CONFIG_KEY } from '../../common/constants';
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
  getCasesClient: GetCasesClientFn
): Promise<CasesClient> {
  const request = context.contextManager.getFakeRequest();
  const actionSource = resolveActionSourceFromStepContext(context);

  if (actionSource == null) {
    return getCasesClient(request);
  }

  return getCasesClient(request, { actionSource });
}

export const resolveActionSourceFromStepContext = (
  context: StepHandlerContext
): ActionSource | undefined => {
  const fromConfig = (context.config as Record<string, unknown> | undefined)?.[
    ACTION_SOURCE_STEP_CONFIG_KEY
  ];
  if (isActionSource(fromConfig)) {
    return fromConfig;
  }

  try {
    const wfCtx = context.contextManager.getContext() as {
      workflow?: { id?: string; name?: string };
      execution?: { id?: string };
    };
    if (typeof wfCtx.workflow?.id === 'string' && wfCtx.workflow.id.length > 0) {
      return toActionSource({
        type: ActionSourceTypes.workflow,
        id: wfCtx.workflow.id,
        name: wfCtx.workflow.name,
        runId: wfCtx.execution?.id,
      });
    }
  } catch {
    // Agent-builder stubs throw from getContext().
  }

  return undefined;
};

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
 * Safe parsing strategy for case outputs in workflow steps:
 */
export const safeParseCaseForWorkflowOutput = <TCaseSchema extends z.ZodType>(
  caseSchema: TCaseSchema,
  outputCase: unknown
): z.infer<TCaseSchema> => {
  const parsed = caseSchema.safeParse(outputCase);
  if (parsed.success) {
    return parsed.data;
  }

  // Last-resort fallback: keep workflow execution moving even if schema/runtime drift remains.
  return outputCase as z.infer<TCaseSchema>;
};

/**
 * Creates a standardized handler for cases workflow steps.
 */
export function createCasesStepHandler<
  TInput = unknown,
  TConfig = unknown,
  TOutputCase extends WorkflowStepCaseResult = WorkflowStepCaseResult
>(
  getCasesClient: GetCasesClientFn,
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
