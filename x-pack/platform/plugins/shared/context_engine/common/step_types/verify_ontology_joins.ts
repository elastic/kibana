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
  MAX_ONTOLOGY_FIELD_NAME_LENGTH,
  MAX_ONTOLOGY_JOIN_CANDIDATES,
  MIN_ONTOLOGY_JOIN_OVERLAP,
  ONTOLOGY_JOIN_SAMPLE_SIZE,
} from '../ontology';
import { ontologyCatalogEntrySchema } from './catalog_ontology_sources';
import { aiIndexIdSchema } from './ki';

export const VERIFY_ONTOLOGY_JOINS_STEP_ID = 'context-engine.verifyOntologyJoins' as const;

const datasetNameSchema = lazySchema(() => z.string().min(1).max(MAX_ONTOLOGY_DATASET_NAME_LENGTH));
const fieldNameSchema = lazySchema(() => z.string().min(1).max(MAX_ONTOLOGY_FIELD_NAME_LENGTH));

export const ontologyJoinCandidateSchema = lazySchema(() =>
  z.object({
    from_dataset: datasetNameSchema,
    from_field: fieldNameSchema,
    to_dataset: datasetNameSchema,
    to_field: fieldNameSchema,
  })
);

export type OntologyJoinCandidate = z.infer<typeof ontologyJoinCandidateSchema>;

export const verifiedOntologyJoinSchema = lazySchema(() =>
  ontologyJoinCandidateSchema.extend({
    overlap: z.number().describe('The share of sampled from values the to dataset holds'),
    sampled: z.number().describe('How many distinct from values were sampled'),
  })
);

export type VerifiedOntologyJoin = z.infer<typeof verifiedOntologyJoinSchema>;

export const verifyOntologyJoinsInputSchema = lazySchema(() =>
  z.object({
    ai_index_id: aiIndexIdSchema,
    catalog: z
      .array(ontologyCatalogEntrySchema)
      .max(MAX_ONTOLOGY_DATASETS)
      .describe('The catalog of the run: candidates must name its datasets and fields'),
    candidates: z
      .array(z.unknown())
      .max(MAX_ONTOLOGY_JOIN_CANDIDATES * 4)
      .default([])
      .describe('Join candidates the describing model proposed; malformed ones are rejected'),
  })
);

export const verifyOntologyJoinsOutputSchema = lazySchema(() =>
  z.object({
    verified: z.array(verifiedOntologyJoinSchema).describe('The joins the data confirms'),
    rejected: z
      .array(z.object({ candidate: z.string(), reason: z.string() }))
      .describe('The candidates that were not kept, each with why'),
  })
);

export type VerifyOntologyJoinsOutput = z.infer<typeof verifyOntologyJoinsOutputSchema>;

export const verifyOntologyJoinsStepCommonDefinition: CommonStepDefinition<
  typeof verifyOntologyJoinsInputSchema,
  typeof verifyOntologyJoinsOutputSchema
> = {
  id: VERIFY_ONTOLOGY_JOINS_STEP_ID,
  label: i18n.translate('xpack.contextEngine.workflows.steps.verifyOntologyJoins.label', {
    defaultMessage: 'Verify ontology joins',
  }),
  description: i18n.translate(
    'xpack.contextEngine.workflows.steps.verifyOntologyJoins.description',
    {
      defaultMessage: 'Keep the join candidates whose fields hold the same values.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: verifyOntologyJoinsInputSchema,
  outputSchema: verifyOntologyJoinsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.contextEngine.workflows.steps.verifyOntologyJoins.documentation.details',
      {
        defaultMessage:
          'For each candidate between two cataloged datasets whose fields have compatible types, ' +
          'samples up to {sampleSize} distinct values of the from field and counts how many the ' +
          'to field holds. A candidate is kept when at least {overlap}% of the sampled values ' +
          'match. Reads as the workflow user, at most {maxCandidates} candidates per call.',
        values: {
          sampleSize: ONTOLOGY_JOIN_SAMPLE_SIZE,
          overlap: MIN_ONTOLOGY_JOIN_OVERLAP * 100,
          maxCandidates: MAX_ONTOLOGY_JOIN_CANDIDATES,
        },
      }
    ),
  },
};
