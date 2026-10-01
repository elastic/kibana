/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import { CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID } from '../../../../common/agent_builder_tools';
import { getSaveAutomationErrorMessage } from '../save_automation/handler';
import { installAutomationTemplateHandler, type InstallAutomationTemplateParams } from './handler';

const MAX_SOURCE_INDEX_LENGTH = 1024;
const MAX_FIELD_NAME_LENGTH = 256;
const MAX_CORPUS_FILTER_LENGTH = 2000;
const MAX_DOCUMENTS_LIMIT = 10_000;
const MAX_BODY_CHARS_LIMIT = 50_000;
const MAX_UNITS_LIMIT = 10_000;
const MAX_KIS_LENGTH = 50_000;

/**
 * Which arguments belong to which template. Anything listed against another template is rejected
 * rather than ignored, so a wrong argument surfaces instead of silently taking a default.
 */
const TEMPLATE_FIELDS = {
  document_orchestration: [
    'titleField',
    'bodyField',
    'corpusFilter',
    'maxDocuments',
    'bodyMaxChars',
  ],
  index_metadata: ['categoryField'],
  unit_profile: ['unitKey', 'activityField', 'breakdownField', 'maxUnits'],
  targeted_ki_writer: ['kis'],
} as const;

const REQUIRED_TEMPLATE_FIELDS = {
  document_orchestration: ['titleField', 'bodyField', 'sourceIndex'],
  index_metadata: ['categoryField', 'sourceIndex'],
  unit_profile: ['unitKey', 'activityField', 'breakdownField', 'sourceIndex'],
  targeted_ki_writer: ['kis'],
} as const;

const installAutomationTemplateSchema = z
  .object({
    template: z
      .enum(['document_orchestration', 'index_metadata', 'unit_profile', 'targeted_ki_writer'])
      .describe(
        'Which automation to install. document_orchestration summarises each document. index_metadata profiles the index. unit_profile writes one profile per recurring unit. targeted_ki_writer writes KIs verbatim from the kis parameter you provide.'
      ),
    sourceIndex: z
      .string()
      .min(1)
      .max(MAX_SOURCE_INDEX_LENGTH)
      .optional()
      .describe(
        'Index or data stream the automation reads. Required for document_orchestration, index_metadata and unit_profile. Not used by targeted_ki_writer.'
      ),
    titleField: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe('Document title field. Required for document_orchestration.'),
    bodyField: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe('Document body field. Required for document_orchestration.'),
    corpusFilter: z
      .string()
      .max(MAX_CORPUS_FILTER_LENGTH)
      .optional()
      .describe(
        'ES|QL clause inserted after FROM, such as "| WHERE published_at >= NOW() - 365 days". A WHERE line may omit the leading pipe. Empty reads the whole index. document_orchestration only. Defaults to empty.'
      ),
    maxDocuments: z
      .number()
      .int()
      .min(1)
      .max(MAX_DOCUMENTS_LIMIT)
      .optional()
      .describe(
        'Upper bound on documents summarised in one run. document_orchestration only. Defaults to 50.'
      ),
    bodyMaxChars: z
      .number()
      .int()
      .min(1)
      .max(MAX_BODY_CHARS_LIMIT)
      .optional()
      .describe(
        'Characters of body text sent to the prompt. document_orchestration only. Defaults to 12000.'
      ),
    categoryField: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe('Keyword field the index profile groups by. Required for index_metadata.'),
    unitKey: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe(
        'Keyword field holding the unit identity. One profile is written per distinct value. Required for unit_profile.'
      ),
    activityField: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe(
        'Date field in sourceIndex. Its per-unit minimum and maximum bound the unit activity the profile reports. Required for unit_profile.'
      ),
    breakdownField: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe(
        'Second field whose per-unit distribution characterises the unit. Required for unit_profile.'
      ),
    maxUnits: z
      .number()
      .int()
      .min(1)
      .max(MAX_UNITS_LIMIT)
      .optional()
      .describe(
        'Upper bound on units profiled in one run. Each costs a model call. unit_profile only. Defaults to 100.'
      ),
    kis: z
      .string()
      .min(1)
      .max(MAX_KIS_LENGTH)
      .optional()
      .describe(
        dedent`
          Required for targeted_ki_writer. YAML-formatted list of KI entries. Each entry is a
          "- ki_id: <id>\\n  ki:\\n    type: <type>\\n    ..." block. Derive ki_id from the finding
          (field, index, question class), not from a date. Put any ES|QL the KI recommends in
          attributes.esql so the verifiers run it. Leave attributes.esql out entirely for KIs
          with no runnable query — never pass an empty list. Use trace://, conversation://, and
          index:// URIs in references. Never invent an id.
        `
      ),
  })
  .superRefine((value, ctx) => {
    for (const field of REQUIRED_TEMPLATE_FIELDS[value.template]) {
      if (value[field] === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `${field} is required for ${value.template}.`,
          path: [field],
        });
      }
    }

    for (const [template, fields] of Object.entries(TEMPLATE_FIELDS)) {
      if (template === value.template) {
        continue;
      }
      for (const field of fields) {
        if (value[field] !== undefined) {
          ctx.addIssue({
            code: 'custom',
            message: `${field} is only valid for ${template}.`,
            path: [field],
          });
        }
      }
    }

    if (value.template === 'targeted_ki_writer' && value.sourceIndex !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'sourceIndex is not valid for targeted_ki_writer.',
        path: ['sourceIndex'],
      });
    }
  });

type InstallAutomationTemplateInput = z.infer<typeof installAutomationTemplateSchema>;

const toInstallParams = (
  input: InstallAutomationTemplateInput
): InstallAutomationTemplateParams => {
  if (input.template === 'targeted_ki_writer') {
    if (!input.kis) {
      throw new Error('kis is required for targeted_ki_writer.');
    }
    return { template: 'targeted_ki_writer', kis: input.kis };
  }

  if (input.template === 'document_orchestration') {
    if (!input.titleField || !input.bodyField || !input.sourceIndex) {
      throw new Error(
        'titleField, bodyField and sourceIndex are required for document_orchestration.'
      );
    }
    return {
      template: 'document_orchestration',
      sourceIndex: input.sourceIndex,
      titleField: input.titleField,
      bodyField: input.bodyField,
      corpusFilter: input.corpusFilter ?? '',
      maxDocuments: input.maxDocuments ?? 50,
      bodyMaxChars: input.bodyMaxChars ?? 12000,
    };
  }

  if (input.template === 'unit_profile') {
    if (!input.unitKey || !input.activityField || !input.breakdownField || !input.sourceIndex) {
      throw new Error(
        'unitKey, activityField, breakdownField and sourceIndex are required for unit_profile.'
      );
    }
    return {
      template: 'unit_profile',
      unitIndex: input.sourceIndex,
      unitKey: input.unitKey,
      activityField: input.activityField,
      breakdownField: input.breakdownField,
      corpusFilter: '',
      maxUnits: input.maxUnits ?? 100,
    };
  }

  if (!input.categoryField || !input.sourceIndex) {
    throw new Error('categoryField and sourceIndex are required for index_metadata.');
  }

  return {
    template: 'index_metadata',
    sourceIndex: input.sourceIndex,
    categoryField: input.categoryField,
  };
};

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export const createInstallAutomationTemplateTool = ({
  getAiIndexService,
  getCoreStart,
  getSecurityStart,
  getWorkflowsManagement,
}: {
  getAiIndexService: () => Promise<AiIndexService>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
  getWorkflowsManagement: () => WorkflowsManagementApi;
}): BuiltinToolDefinition<typeof installAutomationTemplateSchema> => ({
  id: CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID,
  type: ToolType.builtin,
  tags: ['context_engine', 'workflows'],
  annotations: {
    title: 'Install automation template',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  description: dedent`
    Install the index-metadata, document-orchestration, unit-profile or targeted-ki-writer
    automation on the Context Engine AI index attached to this conversation. Arguments fill the
    workflow consts. Do not pass an AI index id and do not write the YAML yourself. Do not start a
    subagent for these templates.
    document_orchestration summarises each document in a bounded corpus into its own KI with
    verified ES|QL access patterns.
    unit_profile writes one KI per distinct unitKey value, grounded in per-unit aggregations.
    targeted_ki_writer has triggers: manual and takes no dynamic parameters beyond the AI index id.
    It writes KIs verbatim from a kis array you edit in the installed workflow's consts block, then
    run with platform.core.execute_workflow. Do not pass sourceIndex.
    If this template is already installed on the AI index, calling this tool again reinstalls it:
    the workflow definition is replaced in-place and the same workflow id is kept. At most one
    automation of each template type exists per AI index — reinstalling never adds a second copy.
  `,
  schema: installAutomationTemplateSchema,
  handler: async (params, { request, spaceId, attachments, logger }) => {
    try {
      const result = await installAutomationTemplateHandler({
        params: toInstallParams(installAutomationTemplateSchema.parse(params)),
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
      logger.error(
        `Error running ${CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID}: ${message}`,
        { error }
      );
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to install automation template: ${message}`,
            },
          },
        ],
      };
    }
  },
});
