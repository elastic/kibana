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
import { SCHEDULE_INTERVAL_PATTERN } from './render';
import {
  extractionSourcesSchema,
  memoryCustomExtractionConfigSchema,
  memoryExtractionConfigSchema,
} from './memory_extraction';

/** Matches the `ai.memory.short_term.list` step limit the promotion template passes it to. */
const MAX_SHORT_TERM_MEMORY_STEP_IDS = 200;

const MAX_SOURCE_INDEX_LENGTH = 1024;
const MAX_FIELD_NAME_LENGTH = 256;
const MAX_CORPUS_FILTER_LENGTH = 2000;
const MAX_DOCUMENTS_LIMIT = 10_000;
const MAX_BODY_CHARS_LIMIT = 50_000;
const MAX_UNITS_LIMIT = 10_000;
const MAX_KIS_LENGTH = 50_000;
/** One KI per source, so the list is capped at the 100-KI onboarding budget (`strategy_catalog`, "The KI budget"). */
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
  memory_promotion: [],
  trace_memory_extraction: ['lookbackHours', 'maxRows'],
  memory_distillation: ['maxMemories', 'purgeAfterDays'],
  memory_extraction: ['extraction'],
  memory_custom_extraction: ['customExtraction'],
  memory_maintenance: ['unusedDays', 'maxOwners', 'maxMemoriesPerOwner'],
} as const;

/** Fields several templates share, checked on their own rather than through `TEMPLATE_FIELDS`. */
const MEMORY_TEMPLATES: readonly string[] = [
  'memory_promotion',
  'trace_memory_extraction',
  'memory_distillation',
  'memory_extraction',
  'memory_custom_extraction',
  'memory_maintenance',
];
const SHORT_TERM_MEMORY_TEMPLATES: readonly string[] = [
  'memory_promotion',
  'memory_extraction',
  'memory_custom_extraction',
];
const AGENT_SCOPED_TEMPLATES: readonly string[] = [
  ...SHORT_TERM_MEMORY_TEMPLATES,
  'memory_maintenance',
];
const MAX_MEMORY_AGENT_IDS = 50;
const MAX_AGENT_ID_LENGTH = 512;

const MAX_METRIC_FIELDS = 10;

/** index_metadata takes either `sources` or `sourceIndex` + `categoryField`; checked separately. */
const REQUIRED_TEMPLATE_FIELDS = {
  document_orchestration: ['titleField', 'bodyField', 'sourceIndex'],
  index_metadata: [],
  unit_profile: ['unitKey', 'activityField', 'breakdownField', 'sourceIndex'],
  targeted_ki_writer: ['kis'],
  memory_promotion: [],
  trace_memory_extraction: [],
  memory_distillation: [],
  memory_extraction: ['extraction'],
  memory_custom_extraction: ['customExtraction'],
  memory_maintenance: [],
} as const;

const findDuplicate = (values: readonly string[]): string | undefined =>
  values.find((item, position) => values.indexOf(item) !== position);

const installAutomationTemplateSchema = z
  .object({
    template: z
      .enum([
        'document_orchestration',
        'index_metadata',
        'unit_profile',
        'targeted_ki_writer',
        'memory_promotion',
        'trace_memory_extraction',
        'memory_distillation',
        'memory_extraction',
        'memory_custom_extraction',
        'memory_maintenance',
      ])
      .describe(
        dedent`
          Which automation to install. Required fields per template:
          document_orchestration   → name, sourceIndex, titleField, bodyField
          index_metadata           → name, sources  (or sourceIndex + categoryField for one index)
          unit_profile             → name, sourceIndex, unitKey, activityField, breakdownField
          targeted_ki_writer       → name, kis  (no sourceIndex)
          memory_promotion         → name  (optional agentIds, batchSize, interval)
          trace_memory_extraction  → name  (optional lookbackHours, maxRows, interval)
          memory_distillation      → name  (optional maxMemories, purgeAfterDays, interval)
          memory_extraction        → name, extraction  (optional memorySources, agentIds, batchSize, interval)
          memory_custom_extraction → name, customExtraction  (optional memorySources, agentIds, batchSize, interval)
          memory_maintenance       → name  (optional agentIds, unusedDays, maxOwners, maxMemoriesPerOwner, interval; Elastic AI index only)
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
    agentIds: z
      .array(z.string().min(1).max(MAX_AGENT_ID_LENGTH))
      .max(MAX_MEMORY_AGENT_IDS)
      .optional()
      .describe(
        "Optional. memory_promotion, memory_extraction and memory_custom_extraction: agents whose users' short-term memories feed this AI index. memory_maintenance: agents whose users' short-term memories are maintained. Defaults to every agent in the space."
      ),
    batchSize: z
      .number()
      .int()
      .min(1)
      .max(MAX_SHORT_TERM_MEMORY_STEP_IDS)
      .optional()
      .describe(
        'Optional. memory_promotion, memory_extraction and memory_custom_extraction. Short-term memories decided per run, in one model call. Defaults to 50.'
      ),
    extraction: memoryExtractionConfigSchema.optional().describe(
      dedent`
          REQUIRED for memory_extraction. What to extract from short-term memories into long-term
          memory: optional "instructions" (the team's rules, such as "'checkout' means
          checkout-service. Ignore small talk."), "facts" and "entities" (each kind a lowercase
          "type", a "description", and for entities usually "attributes" mapping attribute name to
          its meaning), and "relationships" (a "type", a "description", and the "source" and
          "target" fact or entity kinds it connects). Kinds and attribute names are lowercase
          snake_case.
        `
    ),
    memorySources: extractionSourcesSchema.optional().describe(
      dedent`
          Optional. memory_extraction and memory_custom_extraction. Where to read records from,
          each run, one model call per source. Defaults to [{ "type": "short_term_memory" }]: the
          pending short-term memories of the agentIds' users, each marked once decided. A
          { "type": "query" } source runs its ES|QL "query" as the workflow owner: long-term
          memory and KIs of an AI index (only current, active, unexpired ones of this space),
          traces such as "FROM traces-agent_builder.otel-default", or any other readable index.
          Optional per query source: "description" (what the rows are), "lookbackHours" (only the
          last N hours of @timestamp; nothing else marks a row as read, so set it to about the
          interval), "idColumn" and "uriPrefix" (how a row is cited, defaulting to id + ki:// for
          AI indices, trace_id + trace:// for traces, id + record:// otherwise), "excludeMemory"
          (leave memory.* KIs out; defaults to true when the query reads an AI index) and
          "maxRecords" (default 200, at most 1000).
        `
    ),
    customExtraction: memoryCustomExtractionConfigSchema.optional().describe(
      dedent`
          REQUIRED for memory_custom_extraction. Free-form extraction: "instructions" saying what to
          extract, and "types", each a lowercase "type", a "description" and optional
          "attributes" mapping attribute name to a JSON Schema ({ "type": "string" | "number" |
          "boolean" } or { "type": "array", "items": { "type": "string" } }, each with an optional
          "description"; strings may have an "enum").
        `
    ),
    lookbackHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 30)
      .optional()
      .describe(
        'Optional. trace_memory_extraction only. Hours of traces each run reads; keep it at least the interval. Defaults to 24.'
      ),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe(
        'Optional. trace_memory_extraction only. Trace rows read per trace source per run. Defaults to 50.'
      ),
    maxMemories: z
      .number()
      .int()
      .min(2)
      .max(1000)
      .optional()
      .describe(
        'Optional. memory_distillation only. Long-term memories read per run, newest first. Defaults to 200.'
      ),
    purgeAfterDays: z
      .number()
      .int()
      .min(0)
      .max(3650)
      .optional()
      .describe(
        'Optional. memory_distillation only. Days after which deleted and expired memories are permanently removed. Defaults to 30.'
      ),
    unusedDays: z
      .number()
      .int()
      .min(1)
      .max(3650)
      .optional()
      .describe(
        'Optional. memory_maintenance only. Short-term memories neither written nor recalled or shown to an agent for this many days are forgotten. Memories written without an expiry are kept. Defaults to 14.'
      ),
    maxOwners: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe(
        'Optional. memory_maintenance only. User and agent pairs deduplicated per run, one model call each. Defaults to 20.'
      ),
    maxMemoriesPerOwner: z
      .number()
      .int()
      .min(2)
      .max(100)
      .optional()
      .describe(
        'Optional. memory_maintenance only. Memories read per user and agent pair, newest first. Defaults to 50.'
      ),
    interval: z
      .string()
      .regex(SCHEDULE_INTERVAL_PATTERN)
      .optional()
      .describe(
        'Optional. Memory templates only. How often the automation runs, such as "1h" or "1d". Defaults to 1h for memory_promotion and the extraction templates, and 1d for the others.'
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

    if (
      value.memorySources !== undefined &&
      value.template !== 'memory_extraction' &&
      value.template !== 'memory_custom_extraction'
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'memorySources is only valid for memory_extraction and memory_custom_extraction.',
        path: ['memorySources'],
      });
    }

    if (value.agentIds !== undefined && !AGENT_SCOPED_TEMPLATES.includes(value.template)) {
      ctx.addIssue({
        code: 'custom',
        message: `agentIds is only valid for ${AGENT_SCOPED_TEMPLATES.join(', ')}.`,
        path: ['agentIds'],
      });
    }

    if (value.batchSize !== undefined && !SHORT_TERM_MEMORY_TEMPLATES.includes(value.template)) {
      ctx.addIssue({
        code: 'custom',
        message: `batchSize is only valid for ${SHORT_TERM_MEMORY_TEMPLATES.join(', ')}.`,
        path: ['batchSize'],
      });
    }

    if (value.interval !== undefined && !MEMORY_TEMPLATES.includes(value.template)) {
      ctx.addIssue({
        code: 'custom',
        message: 'interval is only valid for the memory templates.',
        path: ['interval'],
      });
    }

    if (MEMORY_TEMPLATES.includes(value.template) && value.sourceIndex !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `sourceIndex is not valid for ${value.template}.`,
        path: ['sourceIndex'],
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

  if (input.template === 'memory_promotion') {
    return {
      template: 'memory_promotion',
      agentIds: input.agentIds ?? [],
      batchSize: input.batchSize ?? 50,
      interval: input.interval ?? '1h',
      name,
    };
  }

  if (input.template === 'trace_memory_extraction') {
    return {
      template: 'trace_memory_extraction',
      lookbackHours: input.lookbackHours ?? 24,
      maxRows: input.maxRows ?? 50,
      interval: input.interval ?? '1d',
      name,
    };
  }

  if (input.template === 'memory_distillation') {
    return {
      template: 'memory_distillation',
      maxMemories: input.maxMemories ?? 200,
      purgeAfterDays: input.purgeAfterDays ?? 30,
      interval: input.interval ?? '1d',
      name,
    };
  }

  if (input.template === 'memory_maintenance') {
    return {
      template: 'memory_maintenance',
      agentIds: input.agentIds ?? [],
      unusedDays: input.unusedDays ?? 14,
      maxOwners: input.maxOwners ?? 20,
      maxMemories: input.maxMemoriesPerOwner ?? 50,
      interval: input.interval ?? '1d',
      name,
    };
  }

  if (input.template === 'memory_extraction') {
    if (!input.extraction) {
      throw new Error('extraction is required for memory_extraction.');
    }
    return {
      template: 'memory_extraction',
      config: input.extraction,
      ...(input.memorySources !== undefined && { sources: input.memorySources }),
      agentIds: input.agentIds ?? [],
      batchSize: input.batchSize ?? 50,
      interval: input.interval ?? '1h',
      name,
    };
  }

  if (input.template === 'memory_custom_extraction') {
    if (!input.customExtraction) {
      throw new Error('customExtraction is required for memory_custom_extraction.');
    }
    return {
      template: 'memory_custom_extraction',
      config: input.customExtraction,
      ...(input.memorySources !== undefined && { sources: input.memorySources }),
      agentIds: input.agentIds ?? [],
      batchSize: input.batchSize ?? 50,
      interval: input.interval ?? '1h',
      name,
    };
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
      memory_promotion, trace_memory_extraction, memory_distillation, memory_maintenance → name

    name is always required. It identifies this automation within the AI index. Same template and
    name → replaces the existing automation in-place. Different name → installs an additional copy.

    document_orchestration summarises each document into its own KI with verified ES|QL access
    patterns.
    index_metadata writes one KI per source index, each profiling that whole index grouped by its
    categoryField. Pass every source of the AI index in sources so one install covers them all.
    unit_profile writes one KI per distinct unitKey value in one index, grounded in per-unit
    aggregations plus the averages of any metricFields.
    targeted_ki_writer takes no dynamic parameters beyond name and kis. It writes KIs verbatim from
    the kis YAML you supply, then the workflow can be run with platform.core.execute_workflow.

    The memory templates maintain the AI index's long-term memory on a schedule:
    memory_promotion promotes generally useful short-term memories of the agentIds' users into it
    (it reads every user's private memories, so it must be installed by an administrator);
    trace_memory_extraction extracts durable facts from the AI index's configured traces;
    memory_distillation merges, synthesizes and retires memories, then purges deleted and expired
    ones. memory_extraction is the structured alternative to memory_promotion: it extracts the
    configured facts, entities and relationships from short-term memories into a knowledge graph
    of long-term memory; memory_custom_extraction does the same for free-form types with typed
    attributes. Install either memory_promotion or one extraction template on an AI index, not
    both: they decide the same pending memories. Install them only on an AI index with memory
    enabled.

    memory_maintenance maintains users' short-term memory itself and installs only on the Elastic
    AI index ("elastic"), where short-term memories live: it forgets expired memories and ones not
    recalled or shown to an agent for unusedDays, then merges duplicates and removes contradicted
    memories within each user's memories of an agent. It reads and changes every user's private
    memories, so it must be installed by an administrator.
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
