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
} from '@kbn/agent-builder-tools-base/workflows';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import {
  MAX_AI_INDEX_AUTOMATION_LENGTH,
  MAX_AI_INDEX_ID_LENGTH,
} from '@kbn/context-engine-plugin/common/constants';
import { validateAiIndexId } from '@kbn/context-engine-plugin/common/validation';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../../../../common/agent_builder_tools';
import type { SavedWorkflowSummary } from './handler';
import {
  getSaveAutomationErrorMessage,
  parseWorkflowEnabledFromYaml,
  parseWorkflowNameFromYaml,
  saveAutomationHandler,
  tryResolveAiIndexDisplayLabelFromAttachments,
  tryResolveSavedWorkflowById,
  tryResolveWorkflowDisplayNameFromAttachments,
  tryResolveWorkflowEnabledFromAttachments,
  tryResolveWorkflowOriginFromAttachments,
} from './handler';

const MAX_ATTACHMENT_ID_LENGTH = 256;
const MAX_WORKFLOW_YAML_LENGTH = 128_000;

const saveAutomationSchema = z
  .object({
    workflowAttachmentId: z
      .string()
      .min(1)
      .max(MAX_ATTACHMENT_ID_LENGTH)
      .optional()
      .describe(
        'Conversation attachment id of the generated workflow (from generate_workflow attachment_id). Saves the YAML and attaches it to the AI index.'
      ),
    workflowYaml: z
      .string()
      .min(1)
      .max(MAX_WORKFLOW_YAML_LENGTH)
      .optional()
      .describe(
        'Complete workflow YAML to save. Use when the definition did not come from generate_workflow — for example when a subagent authored and tested it and returned the YAML.'
      ),
    workflowId: z
      .string()
      .min(1)
      .max(MAX_AI_INDEX_AUTOMATION_LENGTH)
      .optional()
      .describe(
        "Existing saved workflow id. On its own, registers that already-saved workflow as an automation on the AI index. Together with workflowYaml or workflowAttachmentId, overwrites that workflow's definition with the one supplied — the confirmation says so, and the replaced definition cannot be recovered. Omit it to save a new workflow."
      ),
    aiIndexId: z
      .string()
      .max(MAX_AI_INDEX_ID_LENGTH)
      .optional()
      .describe(
        'Context Engine AI index id. Defaults to the id from the ai_index attachment in this conversation.'
      ),
    run: z
      .boolean()
      .optional()
      .describe(
        'Run the automation over the full corpus once this call has saved or attached it — it applies to every way of calling this tool, including attaching a workflow that was already saved. Set only when the user asked for it: the confirmation dialog says so, and the run costs a model call per document. A disabled workflow is enabled in order to run, and stays enabled afterwards. Returns an execution id to poll rather than waiting for completion.'
      ),
  })
  .superRefine((value, ctx) => {
    // At most one definition, since two would be ambiguous about which gets saved. `workflowId` is
    // not a third alternative: it either stands alone as an attach, or names the target of the
    // definition supplied alongside it.
    if (value.workflowAttachmentId !== undefined && value.workflowYaml !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide either workflowAttachmentId or workflowYaml, not both.',
        path: ['workflowAttachmentId'],
      });
    }

    if (
      value.workflowAttachmentId === undefined &&
      value.workflowYaml === undefined &&
      value.workflowId === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide workflowAttachmentId, workflowYaml or workflowId.',
        path: ['workflowAttachmentId'],
      });
    }

    if (value.aiIndexId === undefined) {
      return;
    }

    const validationError = validateAiIndexId(value.aiIndexId);
    if (validationError) {
      ctx.addIssue({
        code: 'custom',
        message: validationError,
        path: ['aiIndexId'],
      });
    }
  });

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export const createSaveAutomationTool = ({
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  getWorkflowsManagement,
}: {
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): BuiltinToolDefinition<typeof saveAutomationSchema> => ({
  id: CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
  type: ToolType.builtin,
  tags: ['context_engine', 'workflows'],
  // Create/upsert write: persists a workflow and attaches it to the AI index.
  annotations: {
    title: 'Save workflow automation',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  description: dedent`
    Save a workflow and/or attach it to a Context Engine AI index as an automation.
    - To persist a draft from generate_workflow, pass workflowAttachmentId.
    - To persist YAML that did not come from generate_workflow, pass workflowYaml.
    - To replace an existing automation, pass its workflowId alongside the new definition. The
      confirmation names the workflow being overwritten.
    - If the user already saved the workflow manually, pass workflowId on its own.
    - To run it over the full corpus straight after saving, pass run: true.
    Requires an ai_index attachment in the conversation unless aiIndexId is provided explicitly.
  `,
  schema: saveAutomationSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: async ({ toolParams, context }) => {
      const { attachments, request, spaceId } = context;
      const aiIndexLabel = tryResolveAiIndexDisplayLabelFromAttachments(
        attachments,
        typeof toolParams.aiIndexId === 'string' ? toolParams.aiIndexId : undefined
      );
      const workflowAttachmentId =
        typeof toolParams.workflowAttachmentId === 'string'
          ? toolParams.workflowAttachmentId
          : undefined;
      const workflowId =
        typeof toolParams.workflowId === 'string' ? toolParams.workflowId : undefined;
      const workflowYaml =
        typeof toolParams.workflowYaml === 'string' ? toolParams.workflowYaml : undefined;

      // The workflow whose stored definition this call would replace: named outright, or carried
      // by the attachment from the last time it was saved. Only meaningful alongside a definition
      // — `workflowId` on its own attaches an existing workflow and writes nothing.
      const targetWorkflowId =
        workflowAttachmentId || workflowYaml
          ? (workflowId ??
            (workflowAttachmentId
              ? tryResolveWorkflowOriginFromAttachments(attachments, workflowAttachmentId)
              : undefined))
          : undefined;

      let draftName: string | undefined;
      let workflowLabel = 'workflow';
      if (workflowAttachmentId) {
        draftName = tryResolveWorkflowDisplayNameFromAttachments(attachments, workflowAttachmentId);
        workflowLabel = draftName
          ? `workflow "${draftName}"`
          : `draft workflow attachment "${workflowAttachmentId}"`;
      } else if (workflowYaml) {
        draftName = parseWorkflowNameFromYaml(workflowYaml);
        workflowLabel = draftName ? `workflow "${draftName}"` : 'the drafted workflow';
      }

      const resolveSaved = async (id: string): Promise<SavedWorkflowSummary | undefined> => {
        const canRead = await hasWorkflowReadPrivilege({
          security: await getSecurityStart(),
          request,
          spaceId,
        });

        return canRead
          ? tryResolveSavedWorkflowById({
              workflowsManagement: getWorkflowsManagement(),
              workflowId: id,
              spaceId,
            })
          : undefined;
      };

      let attachTargetEnabled: boolean | undefined;
      if (!workflowAttachmentId && !workflowYaml && workflowId) {
        const saved = await resolveSaved(workflowId);
        workflowLabel = saved?.name ? `workflow "${saved.name}"` : `workflow "${workflowId}"`;
        attachTargetEnabled = saved?.enabled;
      }

      // The dialog is binary, so a run the caller cannot perform is never offered as one: without
      // the execute privilege this degrades to a plain save, which is what the handler will do.
      const willRun =
        toolParams.run === true &&
        (await hasWorkflowExecutePrivilege({
          security: await getSecurityStart(),
          request,
          spaceId,
        }));

      // What the workflow's `enabled` flag will be once this call has written: whatever the
      // definition being saved declares, or the stored flag when nothing is being written.
      const enabledAfterSave = workflowYaml
        ? parseWorkflowEnabledFromYaml(workflowYaml)
        : workflowAttachmentId
          ? tryResolveWorkflowEnabledFromAttachments(attachments, workflowAttachmentId)
          : attachTargetEnabled;

      // Enabling to run outlasts the run, including a run that fails, so it is a second change to
      // the workflow and not a detail of the first. This dialog is the only place it is visible.
      const enableNotice =
        willRun && enabledAfterSave !== true
          ? ' The workflow is disabled, so it will be enabled in order to run, and stays enabled afterwards even if the run fails.'
          : '';

      if (targetWorkflowId) {
        const existingName = (await resolveSaved(targetWorkflowId))?.name;
        const existingLabel = existingName ? `"${existingName}"` : `with id "${targetWorkflowId}"`;
        // A replacement that also renames is the case most easily mistaken for a new automation,
        // so the rename is called out rather than left to be discovered afterwards.
        const rename =
          draftName && existingName && draftName !== existingName
            ? ` It will be renamed to "${draftName}".`
            : '';
        const overwrite = `This replaces the saved definition of the existing workflow ${existingLabel} attached to AI index "${aiIndexLabel}".${rename} The definition it replaces cannot be recovered.`;

        return willRun
          ? {
              title: 'Replace and run workflow automation',
              message: `${overwrite}${enableNotice} Replace it and run the new definition now over the full corpus?`,
              confirm_text: 'Replace and run',
              cancel_text: 'Cancel',
            }
          : {
              title: 'Replace workflow automation',
              message: `${overwrite} Replace it?`,
              confirm_text: 'Replace',
              cancel_text: 'Cancel',
            };
      }

      if (willRun) {
        return {
          title: 'Save and run workflow automation',
          message: `Save ${workflowLabel} to Kibana, attach it to AI index "${aiIndexLabel}", and run it now over the full corpus?${enableNotice}`,
          confirm_text: 'Save and run',
          cancel_text: 'Cancel',
        };
      }

      return {
        title: 'Save workflow automation',
        message: `Save ${workflowLabel} to Kibana and attach it to AI index "${aiIndexLabel}"?`,
        confirm_text: 'Save and attach',
        cancel_text: 'Cancel',
      };
    },
  },
  handler: async (params, { request, spaceId, attachments, logger }) => {
    try {
      const result = await saveAutomationHandler({
        params,
        request,
        spaceId,
        attachments,
        logger,
        getAiIndexService,
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
      const message = getSaveAutomationErrorMessage(error);
      logger.error(`Error running ${CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID}: ${message}`, {
        error,
      });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to save workflow automation: ${message}`,
            },
          },
        ],
      };
    }
  },
});
