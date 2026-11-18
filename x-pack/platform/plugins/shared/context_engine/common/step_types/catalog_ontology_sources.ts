/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { i18n } from '@kbn/i18n';
import {
  MAX_ONTOLOGY_DATASETS,
  MAX_ONTOLOGY_DATASETS_PER_RUN,
  MAX_ONTOLOGY_DATASET_NAME_LENGTH,
  MAX_ONTOLOGY_FIELDS,
  MAX_ONTOLOGY_FIELD_NAME_LENGTH,
} from '../ontology';
import { aiIndexIdSchema } from './ki';

export const CATALOG_ONTOLOGY_SOURCES_STEP_ID = 'context-engine.catalogOntologySources' as const;

const MAX_FIELD_TYPE_LENGTH = 64;
const MAX_SOURCE_ID_LENGTH = 64;

export const ontologyDatasetKindSchema = lazySchema(() =>
  z.enum(['index', 'data_stream', 'alias'])
);

const datasetNameSchema = lazySchema(() => z.string().min(1).max(MAX_ONTOLOGY_DATASET_NAME_LENGTH));
const fieldNameSchema = lazySchema(() => z.string().min(1).max(MAX_ONTOLOGY_FIELD_NAME_LENGTH));

/** A dataset as cataloged: what its fields are, for checking what a model says about it. */
export const ontologyCatalogEntrySchema = lazySchema(() =>
  z.object({
    name: datasetNameSchema,
    kind: ontologyDatasetKindSchema,
    source_ids: z
      .array(z.string().max(MAX_SOURCE_ID_LENGTH))
      .max(MAX_ONTOLOGY_DATASETS)
      .describe('The ids of the ES|QL sources whose FROM names it'),
    fields: z
      .array(
        z.object({
          name: fieldNameSchema,
          type: z.string().max(MAX_FIELD_TYPE_LENGTH),
          searchable: z.boolean(),
          aggregatable: z.boolean(),
        })
      )
      .max(MAX_ONTOLOGY_FIELDS),
  })
);

export type OntologyCatalogEntry = z.infer<typeof ontologyCatalogEntrySchema>;

const valueSchema = lazySchema(() => z.union([z.string(), z.number(), z.boolean(), z.null()]));

/** A dataset profiled for the describing model. */
export const ontologyDatasetProfileSchema = lazySchema(() =>
  z.object({
    name: datasetNameSchema,
    kind: ontologyDatasetKindSchema,
    id: z.string().describe('The id its dataset KI has, or gets'),
    fingerprint: z.string().max(64),
    reason: z.enum(['new', 'mapping_changed', 'refresh']).describe('Why it is described this run'),
    time_field: z.string().optional(),
    row_count: z.number().optional(),
    earliest: valueSchema.optional(),
    latest: valueSchema.optional(),
    fields: z
      .array(
        z.object({
          name: fieldNameSchema,
          type: z.string().max(MAX_FIELD_TYPE_LENGTH),
          distinct: z.number().optional(),
          top_values: z.array(z.object({ value: valueSchema, count: z.number() })).optional(),
          min: valueSchema.optional(),
          max: valueSchema.optional(),
          avg: valueSchema.optional(),
        })
      )
      .max(MAX_ONTOLOGY_FIELDS),
    omitted_fields: z.number().describe('Fields left out over the cap'),
    current: z
      .object({ description: z.string().optional(), content: z.string().optional() })
      .optional()
      .describe('What its dataset KI says now, when it has one'),
    errors: z.array(z.string()).describe('Profile queries that failed, each with why'),
  })
);

export type OntologyDatasetProfile = z.infer<typeof ontologyDatasetProfileSchema>;

/** An ontology KI as the prompts read it. */
export const existingOntologyKiSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    status: z.string(),
    index: z.string().optional(),
    fields: z.array(z.string()).optional(),
    synonyms: z.array(z.string()).optional(),
  })
);

export type ExistingOntologyKi = z.infer<typeof existingOntologyKiSchema>;

export const catalogOntologySourcesInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    max_datasets: z
      .number()
      .int()
      .min(1)
      .max(MAX_ONTOLOGY_DATASETS_PER_RUN)
      .optional()
      .describe(
        `How many datasets to profile and describe this run. Defaults to ${MAX_ONTOLOGY_DATASETS_PER_RUN}.`
      ),
  })
);

export const catalogOntologySourcesOutputSchema = lazySchema(() =>
  z.object({
    datasets: z
      .array(ontologyDatasetProfileSchema)
      .describe('The datasets to describe this run, profiled'),
    catalog: z
      .array(ontologyCatalogEntrySchema)
      .describe('Every dataset the ES|QL sources read from, with its fields'),
    skipped: z
      .array(z.object({ name: z.string(), reason: z.string() }))
      .describe('Datasets not described this run, each with why'),
    stale: z
      .array(z.string())
      .describe(
        'The ids of dataset KIs whose dataset no source reads any more; empty when a source failed'
      ),
    existing: z
      .array(existingOntologyKiSchema)
      .describe('The ontology KIs of the AI index visible in this space'),
    sources: z
      .array(
        z.object({
          id: z.string(),
          value: z.string(),
          datasets: z.number(),
          error: z.string().optional(),
        })
      )
      .describe('Each ES|QL source: how many datasets it read from, or why it failed'),
  })
);

export type CatalogOntologySourcesOutput = z.infer<typeof catalogOntologySourcesOutputSchema>;

export const catalogOntologySourcesStepCommonDefinition: CommonStepDefinition<
  typeof catalogOntologySourcesInputSchema,
  typeof catalogOntologySourcesOutputSchema
> = {
  id: CATALOG_ONTOLOGY_SOURCES_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.catalogOntologySources.label', {
    defaultMessage: 'Catalog ontology sources',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.catalogOntologySources.description',
    {
      defaultMessage: 'Find and profile the datasets the ES|QL sources of an AI index read from.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: catalogOntologySourcesInputSchema,
  outputSchema: catalogOntologySourcesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.catalogOntologySources.documentation.details',
      {
        defaultMessage:
          'Resolves the FROM of each ES|QL source of the AI index to the indices, data streams ' +
          'and aliases it reads, and reads their fields. A dataset whose fields changed, that has ' +
          'no dataset KI yet, or whose profile is older than the refresh interval is profiled ' +
          'with ES|QL: row count, time range, distinct counts, numeric ranges and, when value ' +
          'samples are on, the top values of low-cardinality fields whose names do not look ' +
          'sensitive. A certified dataset is not profiled. Everything is read as the workflow ' +
          'user, and nothing is written.',
      }
    ),
  },
};
