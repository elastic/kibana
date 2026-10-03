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
/** One KI per source, so the list is capped at the 100-KI budget. */
const MAX_INDEX_METADATA_SOURCES = 100;

/**
 * Which arguments belong to which template. Anything listed against another template is rejected
 * rather than ignored, so a wrong argument surfaces instead of silently taking a default.
 */
const TEMPLATE_FIELDS = {
  document_orchestration: ['titleField', 'bodyField', 'maxDocuments', 'bodyMaxChars'],
  index_metadata: ['categoryField', 'sources'],
  unit_profile: ['unitKey', 'activityField', 'breakdownField', 'metricFields', 'maxUnits'],
  targeted_ki_writer: ['kis'],
} as const;

const MAX_METRIC_FIELDS = 10;

/** index_metadata takes either `sources` or `sourceIndex` + `categoryField`; checked separately. */
const REQUIRED_TEMPLATE_FIELDS = {
  document_orchestration: ['titleField', 'bodyField', 'sourceIndex'],
  index_metadata: [],
  unit_profile: ['unitKey', 'activityField', 'breakdownField', 'sourceIndex'],
  targeted_ki_writer: ['kis'],
} as const;

const findDuplicate = (values: readonly string[]): string | undefined =>
  values.find((item, position) => values.indexOf(item) !== position);

const installAutomationTemplateSchema = z
  .object({
    template: z
      .enum(['document_orchestration', 'index_metadata', 'unit_profile', 'targeted_ki_writer'])
      .describe(
        dedent`
          Which automation to install. Required fields per template:
          document_orchestration → name, sourceIndex, titleField, bodyField
          index_metadata         → name, sources  (or sourceIndex + categoryField for one index)
          unit_profile           → name, sourceIndex, unitKey, activityField, breakdownField
          targeted_ki_writer     → name, kis  (no sourceIndex)
        `
      ),
    name: z
      .string()
      .min(1)
      .max(200)
      .refine((v) => v.trim().length > 0, { message: 'name must not be blank or whitespace-only' })
      .refine((v) => !v.includes('/'), { message: 'name must not contain a forward slash' })
      .describe(
        'REQUIRED. Human-readable name for this automation within the AI index (e.g. "kb-articles-docs", "product-profile"). No forward slashes. Installing the same template with the same name replaces that automation in place; a different name installs an additional copy. Must be provided on every call.'
      ),
    sourceIndex: z
      .string()
      .min(1)
      .max(MAX_SOURCE_INDEX_LENGTH)
      .optional()
      .describe(
        'REQUIRED for document_orchestration and unit_profile. For index_metadata, use sources instead, or sourceIndex + categoryField for a single index. Not used by targeted_ki_writer. Index or data stream the automation reads.'
      ),
    sources: z
      .array(
        z.object({
          index: z.string().min(1).max(MAX_SOURCE_INDEX_LENGTH),
          categoryField: z.string().min(1).max(MAX_FIELD_NAME_LENGTH),
        })
      )
      .min(1)
      .max(MAX_INDEX_METADATA_SOURCES)
      .optional()
      .describe(
        'index_metadata only. Every index to profile, one KI each: list every source of the AI index here so one install covers them all. categoryField is the keyword field that index groups by first.'
      ),
    titleField: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe('REQUIRED for document_orchestration. Document title field.'),
    bodyField: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe('REQUIRED for document_orchestration. Document body field.'),
    categoryField: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe(
        'index_metadata with a single sourceIndex only. Keyword field the index profile groups by.'
      ),
    unitKey: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe(
        'REQUIRED for unit_profile. Keyword field holding the unit identity. One profile is written per distinct value.'
      ),
    activityField: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe(
        'REQUIRED for unit_profile. Date field in sourceIndex. Its per-unit minimum and maximum bound the unit activity the profile reports.'
      ),
    breakdownField: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe(
        'REQUIRED for unit_profile. Second field whose per-unit distribution characterises the unit.'
      ),
    metricFields: z
      .array(z.string().min(1).max(MAX_FIELD_NAME_LENGTH))
      .max(MAX_METRIC_FIELDS)
      .optional()
      .describe(
        'Optional. unit_profile only. Numeric fields in sourceIndex averaged per unit and written into each profile, so sibling profiles carry the numbers that tell them apart. Defaults to none.'
      ),
    kis: z
      .string()
      .min(1)
      .max(MAX_KIS_LENGTH)
      .optional()
      .describe(
        dedent`
          REQUIRED for targeted_ki_writer. YAML-formatted list of KI entries. Each entry is a
          "- ki_id: <id>\\n  ki:\\n    type: <type>\\n    ..." block. Derive ki_id from the finding
          (field, index, question class), not from a date. Put any ES|QL the KI recommends in
          attributes.esql so the verifiers run it. Leave attributes.esql out entirely for KIs
          with no runnable query — never pass an empty list. Use trace://, conversation://, and
          index:// URIs in references. Never invent an id.
        `
      ),
    corpusFilter: z
      .string()
      .max(MAX_CORPUS_FILTER_LENGTH)
      .optional()
      .describe(
        'Optional. ES|QL clause inserted after FROM, such as "| WHERE published_at >= NOW() - 365 days". A WHERE line may omit the leading pipe. Empty reads the whole index. document_orchestration and unit_profile; for unit_profile it bounds both which units are found and which rows each profile counts. Defaults to empty.'
      ),
    maxDocuments: z
      .number()
      .int()
      .min(1)
      .max(MAX_DOCUMENTS_LIMIT)
      .optional()
      .describe(
        'Optional. Upper bound on documents summarised in one run. document_orchestration only. Defaults to 50.'
      ),
    bodyMaxChars: z
      .number()
      .int()
      .min(1)
      .max(MAX_BODY_CHARS_LIMIT)
      .optional()
      .describe(
        'Optional. Characters of body text sent to the prompt. document_orchestration only. Defaults to 12000.'
      ),
    maxUnits: z
      .number()
      .int()
      .min(1)
      .max(MAX_UNITS_LIMIT)
      .optional()
      .describe(
        'Optional. Upper bound on units profiled in one run. Each costs a model call. unit_profile only. Defaults to 100.'
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

    if (
      value.corpusFilter !== undefined &&
      value.template !== 'document_orchestration' &&
      value.template !== 'unit_profile'
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'corpusFilter is only valid for document_orchestration and unit_profile.',
        path: ['corpusFilter'],
      });
    }

    if (value.template === 'index_metadata') {
      const hasSingle = value.sourceIndex !== undefined || value.categoryField !== undefined;
      if (value.sources !== undefined && hasSingle) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Pass either sources or sourceIndex + categoryField for index_metadata, not both.',
          path: ['sources'],
        });
      } else if (
        value.sources === undefined &&
        (value.sourceIndex === undefined || value.categoryField === undefined)
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'index_metadata needs sources, or both sourceIndex and categoryField.',
          path: ['sources'],
        });
      }

      const duplicateIndex = findDuplicate((value.sources ?? []).map(({ index }) => index));
      if (duplicateIndex !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `sources lists '${duplicateIndex}' twice; its two KIs would overwrite each other.`,
          path: ['sources'],
        });
      }
    }

    const duplicateMetric = findDuplicate(value.metricFields ?? []);
    if (duplicateMetric !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `metricFields lists '${duplicateMetric}' twice.`,
        path: ['metricFields'],
      });
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
  const { name } = input;

  if (input.template === 'targeted_ki_writer') {
    if (!input.kis) {
      throw new Error('kis is required for targeted_ki_writer.');
    }
    return { template: 'targeted_ki_writer', kis: input.kis, name };
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
      name,
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
      corpusFilter: input.corpusFilter ?? '',
      metricFields: input.metricFields ?? [],
      maxUnits: input.maxUnits ?? 100,
      name,
    };
  }

  if (input.sources) {
    return { template: 'index_metadata', sources: input.sources, name };
  }

  if (!input.categoryField || !input.sourceIndex) {
    throw new Error('index_metadata needs sources, or sourceIndex and categoryField.');
  }

  return {
    template: 'index_metadata',
    sources: [{ index: input.sourceIndex, categoryField: input.categoryField }],
    name,
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
    Install an automation template on the Context Engine AI index attached to this conversation.
    Do not pass an AI index id; do not write the YAML yourself; do not start a subagent.

    IMPORTANT: install templates one at a time — never call this tool in parallel for the same AI
    index. Concurrent calls cause a "modified concurrently" error; always wait for each call to
    succeed before starting the next.

    Required fields per template (you MUST include all of them or the call will fail):
      document_orchestration → name, sourceIndex, titleField, bodyField
      index_metadata         → name, sources  (or sourceIndex + categoryField for one index)
      unit_profile           → name, sourceIndex, unitKey, activityField, breakdownField
      targeted_ki_writer     → name, kis  (no sourceIndex)

    name is always required. It identifies this automation within the AI index. Same template and
    name → replaces the existing automation in-place. Different name → installs an additional copy.
    If the AI index has a pre-name automation (installed before this tool required a name, e.g.
    named "Document KI automation"), it will NOT be replaced automatically. Delete it manually
    first, then reinstall with a descriptive name.

    document_orchestration summarises each document into its own KI with verified ES|QL access
    patterns.
    index_metadata writes one KI per source index, each profiling that whole index grouped by its
    categoryField. Pass every source of the AI index in sources so one install covers them all.
    unit_profile writes one KI per distinct unitKey value in one index, grounded in per-unit
    aggregations plus the averages of any metricFields.
    targeted_ki_writer takes no dynamic parameters beyond name and kis. It writes KIs verbatim from
    the kis YAML you supply, then the workflow can be run with platform.core.execute_workflow.
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
