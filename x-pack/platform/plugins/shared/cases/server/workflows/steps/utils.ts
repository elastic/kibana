/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { z } from '@kbn/zod/v4';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { AttachmentType } from '../../../common';
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
 * Workflows output schemas are generated from OpenAPI and currently model case comments as:
 * - `alert` or `user` only (no `event`/other attachment types)
 * - alert `rule` fields as optional strings, not nullable
 *
 * The Cases server can still return broader/legacy shapes (for example `event` comments or
 * `rule: { id: null, name: null }` on alert comments). This helper normalizes those known
 * mismatches into a schema-compatible shape before we store workflow step output.
 *
 * TODO: remove once generated workflow schemas and case response payloads are fully aligned.
 */
const normalizeCaseCommentsForWorkflowOutput = (outputCase: unknown): unknown => {
  if (
    outputCase == null ||
    typeof outputCase !== 'object' ||
    !('comments' in outputCase) ||
    !Array.isArray(outputCase.comments)
  ) {
    return outputCase;
  }

  return {
    ...outputCase,
    comments: outputCase.comments
      .filter(
        (comment) =>
          comment != null &&
          typeof comment === 'object' &&
          'type' in comment &&
          (comment.type === AttachmentType.alert || comment.type === AttachmentType.user)
      )
      .map((comment) => {
        if (
          comment == null ||
          typeof comment !== 'object' ||
          comment.type !== AttachmentType.alert ||
          !('rule' in comment)
        ) {
          return comment;
        }

        const rule = comment.rule;
        if (
          rule != null &&
          typeof rule === 'object' &&
          'id' in rule &&
          'name' in rule &&
          rule.id == null &&
          rule.name == null
        ) {
          const { rule: _rule, ...commentWithoutRule } = comment;
          return commentWithoutRule;
        }

        return comment;
      }),
  };
};

/**
 * Safe parsing strategy for case outputs in workflow steps:
 * 1. Attempt parsing the raw case output.
 * 2. If parsing fails, normalize known schema/runtime drift in comments and parse again.
 * 3. If it still fails, return normalized output as a non-throwing fallback so workflow
 *    execution can continue instead of failing on output serialization.
 */
export const safeParseCaseForWorkflowOutput = <TCaseSchema extends z.ZodType>(
  caseSchema: TCaseSchema,
  outputCase: unknown
): z.infer<TCaseSchema> => {
  const parsed = caseSchema.safeParse(outputCase);
  if (parsed.success) {
    return parsed.data;
  }

  const normalizedOutputCase = normalizeCaseCommentsForWorkflowOutput(outputCase);
  const normalizedParsed = caseSchema.safeParse(normalizedOutputCase);
  if (normalizedParsed.success) {
    return normalizedParsed.data;
  }

  // Last-resort fallback: keep workflow execution moving even if schema/runtime drift remains.
  return normalizedOutputCase as z.infer<TCaseSchema>;
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
