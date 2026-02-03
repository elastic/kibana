/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ToolType } from '@kbn/agent-builder-common/tools';
import { z } from '@kbn/zod';
import { sharedValidationSchemas } from './shared_tool_validation';
import type { ToolsService } from '../../../../../services';

const workflowI18nMessages = {
  workflowId: {
    requiredError: i18n.translate('xpack.agentBuilder.tools.workflow.workflowId.requiredError', {
      defaultMessage: 'Workflow is required.',
    }),
    notFoundError: i18n.translate('xpack.agentBuilder.tools.workflow.workflowId.notFoundError', {
      defaultMessage: 'Selected workflow not found.',
    }),
    apiError: i18n.translate('xpack.agentBuilder.tools.workflow.workflowId.error', {
      defaultMessage: 'Error loading workflows.',
    }),
  },
};

export const createWorkflowFormValidationSchema = (toolsService: ToolsService) =>
  z.object({
    toolId: sharedValidationSchemas.toolId,
    description: sharedValidationSchemas.description,
    labels: sharedValidationSchemas.labels,

    workflow_id: z
      .string()
      .min(1, { message: workflowI18nMessages.workflowId.requiredError })
      .refine(
        async (workflowId) => {
          if (!workflowId || !workflowId.trim()) {
            return true;
          }
          try {
            const workflow = await toolsService.getWorkflow(workflowId);
            return workflow.id === workflowId;
          } catch {
            return false;
          }
        },
        { message: workflowI18nMessages.workflowId.notFoundError }
      ),

    wait_for_completion: z.boolean(),

    type: z.literal(ToolType.workflow),
  });
