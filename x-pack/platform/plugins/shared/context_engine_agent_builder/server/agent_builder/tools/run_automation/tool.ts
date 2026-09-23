/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  hasWorkflowExecutePrivilege,
  hasWorkflowReadPrivilege,
  hasWorkflowUpdatePrivilege,
} from '@kbn/agent-builder-tools-base/workflows';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { MAX_AI_INDEX_AUTOMATION_LENGTH } from '@kbn/context-engine-plugin/common/constants';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { CONTEXT_ENGINE_RUN_AUTOMATION_TOOL_ID } from '../../../../common/agent_builder_tools';
import { getRunAutomationErrorMessage, runAutomationHandler } from './handler';
import type { SavedWorkflowSummary } from '../save_automation/handler';
import { tryResolveSavedWorkflowById } from '../save_automation/handler';

const runAutomationSchema = z.object({
  workflowId: z
    .string()
    .min(1)
    .max(MAX_AI_INDEX_AUTOMATION_LENGTH)
    .describe('Id of the saved workflow automation to run over the full corpus.'),
});

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export const createRunAutomationTool = ({
  getCoreStart,
  getSecurityStart,
  getWorkflowsManagement,
}: {
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): BuiltinToolDefinition<typeof runAutomationSchema> => ({
  id: CONTEXT_ENGINE_RUN_AUTOMATION_TOOL_ID,
  type: ToolType.builtin,
  tags: ['context_engine', 'workflows'],
  annotations: {
    title: 'Run workflow automation',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  description: dedent`
    Run a saved Context Engine workflow automation over the full corpus.
    Starts execution asynchronously and returns an execution id — the run continues after this
    call returns. Use platform.core.get_workflow_execution_status to check progress.
    A disabled workflow is enabled in order to run, and stays enabled afterwards.
    Call this after save_automation when the user has asked to run the automation.
  `,
  schema: runAutomationSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams, context }) => {
      const { request, spaceId } = context;
      const workflowId =
        typeof toolParams.workflowId === 'string' ? toolParams.workflowId : undefined;

      if (!workflowId) {
        return {
          title: 'Run workflow automation',
          message: 'Run this automation over the full corpus? This costs a model call per document.',
          confirm_text: 'Run automation',
          cancel_text: 'Cancel',
        };
      }

      const resolveSaved = async (id: string): Promise<SavedWorkflowSummary | undefined> => {
        const security = await getSecurityStart();
        const canRead = await hasWorkflowReadPrivilege({ security, request, spaceId });
        return canRead
          ? tryResolveSavedWorkflowById({
              workflowsManagement: getWorkflowsManagement(),
              workflowId: id,
              spaceId,
            })
          : undefined;
      };

      const saved = await resolveSaved(workflowId);
      const workflowLabel = saved?.name ? `"${saved.name}"` : `workflow "${workflowId}"`;

      const canExecute = await hasWorkflowExecutePrivilege({
        security: await getSecurityStart(),
        request,
        spaceId,
      });

      if (!canExecute) {
        return {
          title: 'Run workflow automation',
          message: `You do not have permission to run ${workflowLabel}.`,
          confirm_text: 'OK',
          cancel_text: 'Cancel',
        };
      }

      const enableNotice =
        saved?.enabled !== true
          ? ' The workflow is currently disabled and will be enabled in order to run, and stays enabled afterwards even if the run fails.'
          : '';

      const canUpdate = await hasWorkflowUpdatePrivilege({
        security: await getSecurityStart(),
        request,
        spaceId,
      });

      const enableBlockNotice =
        saved?.enabled !== true && !canUpdate
          ? ' The workflow is disabled and you do not have permission to enable it, so it cannot be run.'
          : enableNotice;

      return {
        title: 'Run workflow automation',
        message: `Run ${workflowLabel} over the full corpus? This costs a model call per document.${enableBlockNotice}`,
        confirm_text: 'Run automation',
        cancel_text: 'Cancel',
      };
    },
  },
  handler: async (params, { request, spaceId, logger }) => {
    try {
      const result = await runAutomationHandler({
        params,
        request,
        spaceId,
        logger,
        getCoreStart,
        getSecurityStart,
        getWorkflowsManagement,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: result,
          },
        ],
      };
    } catch (error) {
      const message = getRunAutomationErrorMessage(error);
      logger.error(`Error running ${CONTEXT_ENGINE_RUN_AUTOMATION_TOOL_ID}: ${message}`, {
        error,
      });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to run workflow automation: ${message}`,
            },
          },
        ],
      };
    }
  },
});
