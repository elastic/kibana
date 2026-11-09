/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { ServerHandlerStepDefinition } from '@kbn/workflows-extensions/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { INVESTIGATION_TEMPLATE_ID } from '../../../common/escalations/constants';
import { appendWorkflowExecutionIdStepCommonDefinition } from '../../../common/workflow_execution/step_types';
import { WrongTemplateError } from '../../assignments/errors';
import { parseStepInput } from '../../impact/step_types/parse_step_input';
import { toStepError } from '../../investigations/step_types/to_step_error';

/** Appends a workflow execution to an investigation unless it is already recorded. */
export const getAppendWorkflowExecutionIdStepDefinition = ({
  getConversationClient,
}: {
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}): ServerHandlerStepDefinition<
  typeof appendWorkflowExecutionIdStepCommonDefinition.inputSchema,
  typeof appendWorkflowExecutionIdStepCommonDefinition.outputSchema
> =>
  createServerStepDefinition({
    ...appendWorkflowExecutionIdStepCommonDefinition,
    handler: async (context) => {
      try {
        const { conversationId, workflowExecutionId } = parseStepInput(
          appendWorkflowExecutionIdStepCommonDefinition.inputSchema,
          context.input
        );
        const request = context.contextManager.getFakeRequest();
        const client = await getConversationClient(request);
        const { template_id: templateId, metadata } = await client.get(conversationId);
        if (templateId !== INVESTIGATION_TEMPLATE_ID) {
          throw new WrongTemplateError(conversationId, INVESTIGATION_TEMPLATE_ID);
        }

        const executionIds = metadata?.workflow_execution_ids ?? [];
        if (!Array.isArray(executionIds) || executionIds.some((id) => typeof id !== 'string')) {
          throw new ExecutionError({
            type: 'ValidationError',
            message: 'Investigation workflow_execution_ids must be an array of strings',
          });
        }

        // This read/check/write supports sequential handoffs; simultaneous appends can overwrite each other.
        if (!executionIds.includes(workflowExecutionId)) {
          await client.patchMetadata(
            conversationId,
            { workflow_execution_ids: [...executionIds, workflowExecutionId] },
            { access: 'converse' }
          );
        }

        return { output: { workflowExecutionId } };
      } catch (error) {
        throw toStepError(error, 'Failed to append investigation workflow execution');
      }
    },
  });
