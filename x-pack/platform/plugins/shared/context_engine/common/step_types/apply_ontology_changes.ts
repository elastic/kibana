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
import { MAX_KI_CONTENT_LENGTH } from '../constants';
import {
  MAX_ACCESS_PATTERN_LABEL_LENGTH,
  MAX_ACCESS_PATTERN_RETURNS_LENGTH,
  MAX_DREAMING_ACCESS_PATTERNS,
  MAX_DREAMING_TYPE_LENGTH,
} from '../dreaming';
import {
  MAX_CONNECTOR_PARAMS_LENGTH,
  MAX_ONTOLOGY_DATASETS,
  MAX_ONTOLOGY_DATASETS_PER_RUN,
  MAX_ONTOLOGY_DATASET_NAME_LENGTH,
  MAX_ONTOLOGY_JOIN_CANDIDATES,
  MAX_ONTOLOGY_TERMS,
  MAX_ONTOLOGY_TERM_FIELDS,
  MAX_ONTOLOGY_TERM_NAME_LENGTH,
  MAX_ONTOLOGY_TERM_SYNONYMS,
} from '../ontology';
import { accessPatternSchema, plannedWriteSchema, rejectedItemSchema } from './apply_dream_changes';
import {
  ontologyCatalogEntrySchema,
  ontologyDatasetProfileSchema,
  sourceIdSchema,
} from './catalog_ontology_sources';
import { aiIndexIdSchema, MAX_KI_DESCRIPTION_LENGTH } from './ki';
import { verifiedOntologyJoinSchema } from './verify_ontology_joins';

export const APPLY_ONTOLOGY_CHANGES_STEP_ID = 'context-engine.applyOntologyChanges' as const;

const MAX_ROUND_IDS = 20;
const MAX_ROUND_ID_LENGTH = 256;
const MAX_SUB_ACTION_LENGTH = 128;

const accessPatternsSchema = lazySchema(() =>
  z.array(accessPatternSchema).max(MAX_DREAMING_ACCESS_PATTERNS)
);

/** A question a connector answers: which read sub-action to call, with which params. */
export const connectorAccessPatternSchema = lazySchema(() =>
  z.object({
    question_type: z.string().min(1).max(MAX_ACCESS_PATTERN_LABEL_LENGTH),
    sub_action: z.string().min(1).max(MAX_SUB_ACTION_LENGTH),
    params_template: z
      .string()
      .min(1)
      .max(MAX_CONNECTOR_PARAMS_LENGTH)
      .describe('The params as JSON, with ?name placeholders where the values go'),
    params_example: z
      .string()
      .min(1)
      .max(MAX_CONNECTOR_PARAMS_LENGTH)
      .describe('The params as JSON with real values; the call must succeed'),
    returns: z.string().min(1).max(MAX_ACCESS_PATTERN_RETURNS_LENGTH),
  })
);

export type ConnectorAccessPattern = z.infer<typeof connectorAccessPatternSchema>;

const connectorAccessPatternsSchema = lazySchema(() =>
  z.array(connectorAccessPatternSchema).max(MAX_DREAMING_ACCESS_PATTERNS)
);

const termFieldSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(MAX_ONTOLOGY_DATASET_NAME_LENGTH * 2)
);

/** What the ontology models propose for one source: dataset descriptions and business terms. */
export const ontologyChangeSetSchema = lazySchema(() =>
  z.object({
    datasets: z
      .array(
        z.object({
          name: z.string().min(1).max(MAX_ONTOLOGY_DATASET_NAME_LENGTH),
          description: z.string().max(MAX_KI_DESCRIPTION_LENGTH),
          content: z.string().max(MAX_KI_CONTENT_LENGTH),
          access_patterns: accessPatternsSchema.optional(),
          connector_access_patterns: connectorAccessPatternsSchema.optional(),
          source_round_ids: z
            .array(z.string().max(MAX_ROUND_ID_LENGTH))
            .max(MAX_ROUND_IDS)
            .optional(),
        })
      )
      .max(MAX_ONTOLOGY_DATASETS_PER_RUN)
      .default([]),
    terms: z
      .array(
        z.object({
          name: z.string().min(1).max(MAX_ONTOLOGY_TERM_NAME_LENGTH),
          delete: z.boolean().optional(),
          description: z.string().max(MAX_KI_DESCRIPTION_LENGTH).optional(),
          synonyms: z
            .array(z.string().min(1).max(MAX_ONTOLOGY_TERM_NAME_LENGTH))
            .max(MAX_ONTOLOGY_TERM_SYNONYMS)
            .optional(),
          fields: z.array(termFieldSchema).max(MAX_ONTOLOGY_TERM_FIELDS).optional(),
          attributes: z
            .array(
              z.object({
                attribute: z.string().min(1).max(MAX_DREAMING_TYPE_LENGTH),
                field: termFieldSchema,
              })
            )
            .max(MAX_ONTOLOGY_TERM_FIELDS)
            .optional(),
          access_patterns: accessPatternsSchema.optional(),
          connector_access_patterns: connectorAccessPatternsSchema.optional(),
        })
      )
      .max(MAX_ONTOLOGY_TERMS)
      .default([]),
  })
);

export type OntologyChangeSet = z.infer<typeof ontologyChangeSetSchema>;

export const applyOntologyChangesInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    source_id: sourceIdSchema,
    catalog: z
      .array(ontologyCatalogEntrySchema)
      .max(MAX_ONTOLOGY_DATASETS)
      .describe("The source's datasets: datasets and term fields must be in it"),
    profiles: z
      .array(ontologyDatasetProfileSchema)
      .max(MAX_ONTOLOGY_DATASETS_PER_RUN)
      .nullish()
      .describe('The profiles of the datasets described this run, for their stored attributes'),
    changes: z.unknown().optional().describe('The change set a model returned: datasets and terms'),
    joins: z
      .array(verifiedOntologyJoinSchema)
      .max(MAX_ONTOLOGY_JOIN_CANDIDATES)
      .nullish()
      .describe('Joins verifyOntologyJoins kept, written as joins_with relationships'),
    stale: z
      .array(z.string().max(512))
      .max(MAX_ONTOLOGY_DATASETS)
      .nullish()
      .describe('Dataset KI ids the source no longer reads'),
    dry_run: z
      .boolean()
      .optional()
      .describe('Check the changes and report what would be written, without writing'),
  })
);

export const applyOntologyChangesOutputSchema = lazySchema(() =>
  z.object({
    created: z.number().describe('Ontology KIs and relationships created'),
    updated: z.number().describe('Ontology KIs and relationships updated'),
    deleted: z.number().describe('Ontology KIs and relationships deleted'),
    rejected: z
      .array(rejectedItemSchema)
      .describe('Items of the change set that were not applied, each with why'),
    dropped_access_patterns: z
      .number()
      .describe('Access patterns dropped because their example did not run'),
    would_write: z
      .array(plannedWriteSchema)
      .optional()
      .describe('On a dry run, each KI it would write; nothing is stored'),
  })
);

export type ApplyOntologyChangesOutput = z.infer<typeof applyOntologyChangesOutputSchema>;

export const applyOntologyChangesStepCommonDefinition: CommonStepDefinition<
  typeof applyOntologyChangesInputSchema,
  typeof applyOntologyChangesOutputSchema
> = {
  id: APPLY_ONTOLOGY_CHANGES_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.applyOntologyChanges.label', {
    defaultMessage: 'Apply ontology changes',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.applyOntologyChanges.description',
    {
      defaultMessage:
        'Write the datasets, terms and joins ontology discovery found in one source into an AI index.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: applyOntologyChangesInputSchema,
  outputSchema: applyOntologyChangesOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.applyOntologyChanges.documentation.details',
      {
        defaultMessage:
          'Writes each dataset of the source as an ontology.dataset KI and each term as an ' +
          'ontology.term KI, with ids derived from their names, visible in this space. A term ' +
          "must name a field of the source's datasets, as dataset:field; the source owns only " +
          'those fields, and the fields other sources gave the term are kept. When the dreaming ' +
          'config has entity types, a term must be one of them. Each term is linked to the ' +
          "source's datasets that store it with stored_in, and each verified join becomes a " +
          'joins_with relationship. ES|QL access patterns whose example does not run, and ' +
          'connector access patterns whose example call fails, are dropped. A stale dataset ' +
          'another source still reads keeps its KI. A dry run reports what it would write and ' +
          'writes nothing.',
      }
    ),
  },
};
