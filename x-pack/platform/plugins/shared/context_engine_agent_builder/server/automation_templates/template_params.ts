/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AutomationTemplateId } from '../agent_builder/tools/install_automation_template/render';
import type { InstallAutomationTemplateParams } from './install_automation_template';

export const MAX_AUTOMATION_NAME_LENGTH = 200;
export const MAX_SOURCE_INDEX_LENGTH = 1024;
export const MAX_FIELD_NAME_LENGTH = 256;
export const MAX_CORPUS_FILTER_LENGTH = 2000;
export const MAX_DOCUMENTS_LIMIT = 10_000;
export const MAX_BODY_CHARS_LIMIT = 50_000;
export const MAX_UNITS_LIMIT = 10_000;
export const MAX_KIS_LENGTH = 50_000;
export const MAX_METRIC_FIELDS = 10;
/** One KI per source, so the list is capped at the 100-KI onboarding budget (`strategy_catalog`, "The KI budget"). */
export const MAX_INDEX_METADATA_SOURCES = 100;

export const DEFAULT_MAX_DOCUMENTS = 50;
export const DEFAULT_BODY_MAX_CHARS = 12_000;
export const DEFAULT_MAX_UNITS = 100;

export const findDuplicate = (values: readonly string[]): string | undefined =>
  values.find((item, position) => values.indexOf(item) !== position);

export const automationNameSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_AUTOMATION_NAME_LENGTH)
    .refine((v) => v.trim().length > 0, { message: 'name must not be blank or whitespace-only' })
    .refine((v) => !v.includes('/'), { message: 'name must not contain a forward slash' })
);

const indexName = () => z.string().min(1).max(MAX_SOURCE_INDEX_LENGTH);
const fieldName = () => z.string().min(1).max(MAX_FIELD_NAME_LENGTH);
const corpusFilter = () =>
  z
    .string()
    .max(MAX_CORPUS_FILTER_LENGTH)
    .default('')
    .describe(
      'ES|QL clause inserted after FROM, such as "| WHERE published_at >= NOW() - 365 days". Empty reads the whole index.'
    );

const documentOrchestrationParamsSchema = lazySchema(() =>
  z
    .object({
      sourceIndex: indexName().describe('Index or data stream the documents are read from.'),
      titleField: fieldName().describe('Field holding the document title.'),
      bodyField: fieldName().describe('Field holding the document body.'),
      corpusFilter: corpusFilter(),
      maxDocuments: z
        .number()
        .int()
        .min(1)
        .max(MAX_DOCUMENTS_LIMIT)
        .default(DEFAULT_MAX_DOCUMENTS)
        .describe('Most documents summarised in one run, one model call each.'),
      bodyMaxChars: z
        .number()
        .int()
        .min(1)
        .max(MAX_BODY_CHARS_LIMIT)
        .default(DEFAULT_BODY_MAX_CHARS)
        .describe('Characters of body text sent to the model.'),
    })
    .strict()
);

const indexMetadataParamsSchema = lazySchema(() =>
  z
    .object({
      sources: z
        .array(
          z
            .object({
              index: indexName().describe('Index to profile.'),
              categoryField: fieldName().describe('Keyword field the index groups by first.'),
            })
            .strict()
        )
        .min(1)
        .max(MAX_INDEX_METADATA_SOURCES)
        .describe('Every index to profile, one KI each.'),
    })
    .strict()
    .superRefine(({ sources }, ctx) => {
      const duplicate = findDuplicate(sources.map(({ index }) => index));
      if (duplicate !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `sources lists '${duplicate}' twice; its two KIs would overwrite each other.`,
          path: ['sources'],
        });
      }
    })
);

const unitProfileParamsSchema = lazySchema(() =>
  z
    .object({
      sourceIndex: indexName().describe('Index the units are found in and aggregated from.'),
      unitKey: fieldName().describe('Keyword field holding the unit identity, one KI per value.'),
      activityField: fieldName().describe('Date field whose per-unit range bounds the activity.'),
      breakdownField: fieldName().describe(
        'Field whose per-unit distribution characterises a unit.'
      ),
      metricFields: z
        .array(fieldName())
        .max(MAX_METRIC_FIELDS)
        .default([])
        .describe('Numeric fields averaged per unit.'),
      corpusFilter: corpusFilter(),
      maxUnits: z
        .number()
        .int()
        .min(1)
        .max(MAX_UNITS_LIMIT)
        .default(DEFAULT_MAX_UNITS)
        .describe('Most units profiled in one run, one model call each.'),
    })
    .strict()
    .superRefine(({ metricFields }, ctx) => {
      const duplicate = findDuplicate(metricFields);
      if (duplicate !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `metricFields lists '${duplicate}' twice.`,
          path: ['metricFields'],
        });
      }
    })
);

const targetedKiWriterParamsSchema = lazySchema(() =>
  z
    .object({
      kis: z
        .string()
        .min(1)
        .max(MAX_KIS_LENGTH)
        .describe('YAML list of `- ki_id: <id>` / `ki:` entries, written verbatim.'),
    })
    .strict()
);

/** The body of an install: the template, the automation name and that template's parameters. */
export const installAutomationTemplateRequestSchema = lazySchema(() =>
  z.discriminatedUnion('template', [
    z
      .object({
        template: z.literal('document_orchestration'),
        name: automationNameSchema,
        params: documentOrchestrationParamsSchema,
      })
      .strict(),
    z
      .object({
        template: z.literal('index_metadata'),
        name: automationNameSchema,
        params: indexMetadataParamsSchema,
      })
      .strict(),
    z
      .object({
        template: z.literal('unit_profile'),
        name: automationNameSchema,
        params: unitProfileParamsSchema,
      })
      .strict(),
    z
      .object({
        template: z.literal('targeted_ki_writer'),
        name: automationNameSchema,
        params: targetedKiWriterParamsSchema,
      })
      .strict(),
  ])
);

export type InstallAutomationTemplateRequest = z.infer<
  typeof installAutomationTemplateRequestSchema
>;

/** Maps a validated request to what the install renders. */
export const toInstallAutomationTemplateParams = (
  request: InstallAutomationTemplateRequest
): InstallAutomationTemplateParams => {
  const { name } = request;
  if (request.template === 'document_orchestration') {
    return { template: 'document_orchestration', name, ...request.params };
  }
  if (request.template === 'index_metadata') {
    return { template: 'index_metadata', name, sources: request.params.sources };
  }
  if (request.template === 'unit_profile') {
    const { sourceIndex, ...rest } = request.params;
    return { template: 'unit_profile', name, unitIndex: sourceIndex, ...rest };
  }
  return { template: 'targeted_ki_writer', name, kis: request.params.kis };
};

export interface AutomationTemplateCatalogEntry {
  id: AutomationTemplateId;
  title: string;
  description: string;
  /** JSON Schema of the template's `params`, as accepted on install. */
  parameters: z.core.JSONSchema.BaseSchema;
}

const TEMPLATE_PARAMS_SCHEMAS: Record<AutomationTemplateId, z.ZodType> = {
  document_orchestration: documentOrchestrationParamsSchema,
  index_metadata: indexMetadataParamsSchema,
  unit_profile: unitProfileParamsSchema,
  targeted_ki_writer: targetedKiWriterParamsSchema,
};

const getTemplateTexts = (): Record<
  AutomationTemplateId,
  { title: string; description: string }
> => ({
  document_orchestration: {
    title: i18n.translate('xpack.contextEngine.automationTemplates.documentOrchestration.title', {
      defaultMessage: 'Document summaries',
    }),
    description: i18n.translate(
      'xpack.contextEngine.automationTemplates.documentOrchestration.description',
      {
        defaultMessage:
          'Summarises each document in a bounded corpus into its own knowledge indicator, with verified ES|QL access patterns.',
      }
    ),
  },
  index_metadata: {
    title: i18n.translate('xpack.contextEngine.automationTemplates.indexMetadata.title', {
      defaultMessage: 'Index profiles',
    }),
    description: i18n.translate(
      'xpack.contextEngine.automationTemplates.indexMetadata.description',
      {
        defaultMessage:
          'Profiles each source index into one knowledge indicator describing what it holds and how to query it.',
      }
    ),
  },
  unit_profile: {
    title: i18n.translate('xpack.contextEngine.automationTemplates.unitProfile.title', {
      defaultMessage: 'Unit profiles',
    }),
    description: i18n.translate('xpack.contextEngine.automationTemplates.unitProfile.description', {
      defaultMessage:
        'Writes one knowledge indicator per distinct unit in an index, such as a product or a customer, grounded in per-unit aggregations.',
    }),
  },
  targeted_ki_writer: {
    title: i18n.translate('xpack.contextEngine.automationTemplates.targetedKiWriter.title', {
      defaultMessage: 'Targeted knowledge indicators',
    }),
    description: i18n.translate(
      'xpack.contextEngine.automationTemplates.targetedKiWriter.description',
      {
        defaultMessage:
          'Writes the given knowledge indicators verbatim, each verified before it is stored.',
      }
    ),
  },
});

/** Every installable template, with the JSON Schema of the parameters its install takes. */
export const getAutomationTemplateCatalog = (): AutomationTemplateCatalogEntry[] => {
  const texts = getTemplateTexts();
  return (Object.keys(TEMPLATE_PARAMS_SCHEMAS) as AutomationTemplateId[]).map((id) => ({
    id,
    ...texts[id],
    parameters: z.toJSONSchema(TEMPLATE_PARAMS_SCHEMAS[id], { io: 'input' }),
  }));
};
