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
  MAX_ONTOLOGY_DATASET_NAME_LENGTH,
  MAX_ONTOLOGY_HISTORY_ROUNDS,
} from '../ontology';
import { aiIndexIdSchema } from './ki';

export const READ_ONTOLOGY_QUERY_HISTORY_STEP_ID =
  'context-engine.readOntologyQueryHistory' as const;

const MAX_TIMESTAMP_LENGTH = 64;

export const readOntologyQueryHistoryInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    datasets: z
      .array(z.string().min(1).max(MAX_ONTOLOGY_DATASET_NAME_LENGTH))
      .max(MAX_ONTOLOGY_DATASETS)
      .describe('The datasets to keep queries for: a query is kept when its FROM names one'),
    since: z
      .string()
      .max(MAX_TIMESTAMP_LENGTH)
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Must be an ISO 8601 date.' })
      .describe('Read the rounds that ended since this ISO 8601 time'),
    size: z
      .number()
      .int()
      .min(1)
      .max(MAX_ONTOLOGY_HISTORY_ROUNDS)
      .optional()
      .describe(
        `How many rounds to scan, oldest first. Defaults to ${MAX_ONTOLOGY_HISTORY_ROUNDS}.`
      ),
  })
);

export const ontologyHistoryQuerySchema = lazySchema(() =>
  z.object({
    dataset: z.string(),
    query: z.string(),
    round_id: z.string().describe('The round the query was run in, as trace:<trace id>'),
  })
);

export type OntologyHistoryQuery = z.infer<typeof ontologyHistoryQuerySchema>;

export const readOntologyQueryHistoryOutputSchema = lazySchema(() =>
  z.object({
    queries: z
      .array(ontologyHistoryQuerySchema)
      .describe('ES|QL queries agents ran on the datasets, deduplicated, newest kept per dataset'),
    rounds: z.number().describe('Rounds scanned'),
    sources: z
      .array(
        z.object({
          type: z.string(),
          value: z.string(),
          rounds: z.number(),
          error: z.string().optional(),
        })
      )
      .describe('Each trace source of the AI index: how many rounds it found, or why it failed'),
  })
);

export type ReadOntologyQueryHistoryOutput = z.infer<typeof readOntologyQueryHistoryOutputSchema>;

export const readOntologyQueryHistoryStepCommonDefinition: CommonStepDefinition<
  typeof readOntologyQueryHistoryInputSchema,
  typeof readOntologyQueryHistoryOutputSchema
> = {
  id: READ_ONTOLOGY_QUERY_HISTORY_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.readOntologyQueryHistory.label', {
    defaultMessage: 'Read ontology query history',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.readOntologyQueryHistory.description',
    {
      defaultMessage: 'Collect the ES|QL queries agents ran on the datasets of an AI index.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: readOntologyQueryHistoryInputSchema,
  outputSchema: readOntologyQueryHistoryOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.readOntologyQueryHistory.documentation.details',
      {
        defaultMessage:
          'Reads the agent rounds the trace sources of the AI index found since the given time, ' +
          'as the workflow user, and keeps the ES|QL queries their tool calls ran whose FROM ' +
          'names one of the datasets. Returns nothing when the AI index has no trace sources or ' +
          'ontology discovery does not read query history.',
      }
    ),
  },
};
