/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Detection, SignificantEvent } from '@kbn/significant-events-schema';
import { z } from '@kbn/zod';
import { VALID_KI_FEATURE_TYPES } from '../evaluators/ki_feature_extraction/types';
import type {
  DiscoveryScenario,
  KIFeatureDeduplicationScenario,
  KIFeatureExclusionScenario,
  KIFeatureExtractionScenario,
  KIQueryGenerationScenario,
} from './types';

/**
 * Version of the whole ground-truth file format. `dataset.json` and every `ground-truth.json` of a
 * run carry the same value; bump it once for both when either shape changes. The assembler rejects
 * files it does not understand and files that disagree with their manifest.
 */
export const GROUND_TRUTH_SCHEMA_VERSION = 1;

export type WithoutSnapshotSource<T> = Omit<T, 'snapshot_source'>;

/** `<dataset-id>/dataset.json`. */
export interface DatasetManifest {
  schema_version: typeof GROUND_TRUTH_SCHEMA_VERSION;
  id: string;
  description: string;
}

/**
 * One `<dataset-id>/<scenario-snapshot>/ground-truth.json`: the scenarios of every eval family that
 * run against that snapshot. The envelope (`dataset`, `snapshot`) repeats the directory names so a
 * file is meaningful on its own; the assembler checks they agree. `snapshot_source` is absent on
 * purpose; the directory is the snapshot and assembly stamps it back on.
 */
export interface GroundTruthSlice {
  schema_version: typeof GROUND_TRUTH_SCHEMA_VERSION;
  dataset: string;
  snapshot: string;
  kiQueryGeneration?: Array<WithoutSnapshotSource<KIQueryGenerationScenario>>;
  kiFeatureExtraction?: Array<WithoutSnapshotSource<KIFeatureExtractionScenario>>;
  kiFeatureExclusion?: Array<WithoutSnapshotSource<KIFeatureExclusionScenario>>;
  kiFeatureDeduplication?: Array<WithoutSnapshotSource<KIFeatureDeduplicationScenario>>;
  discovery?: Array<WithoutSnapshotSource<DiscoveryScenario>>;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Shapes owned by Elasticsearch or the significant-events plugin: validated as objects only.
const esQuerySchema = z.custom<QueryDslQueryContainer>(isPlainObject, {
  message: 'Expected an Elasticsearch query object',
});
const partialDetectionSchema = z.custom<Partial<Detection>>(isPlainObject, {
  message: 'Expected a detection object',
});
const partialSignificantEventSchema = z.custom<Partial<SignificantEvent>>(isPlainObject, {
  message: 'Expected a significant event object',
});

const samplingCriterionSchema = z.strictObject({
  id: z.string(),
  text: z.string(),
  score: z.number().optional(),
  sampling_filters: z.array(esQuerySchema).optional(),
});

const scenarioMetadataSchema = z.looseObject({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  failure_domain: z.string(),
  failure_mode: z.string().optional(),
});

const existingQuerySummarySchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  severity_score: z.number().optional(),
  description: z.string(),
  esql: z.string(),
});

const chronicSeedSchema = z.strictObject({
  phrase: z.string(),
  service: z.string(),
  rate_per_minute: z.number(),
  duration_minutes: z.number(),
  detection_offset_minutes: z.number(),
  ki_title: z.string(),
  ki_description: z.string(),
});

const kiQueryGenerationScenarioSchema: z.ZodType<WithoutSnapshotSource<KIQueryGenerationScenario>> =
  z.strictObject({
    input: z.strictObject({
      scenario_id: z.string(),
      stream_name: z.string(),
      stream_description: z.string(),
    }),
    output: z.strictObject({
      criteria: z.array(samplingCriterionSchema),
      expected_categories: z.array(z.string()),
      expected_ground_truth: z.string(),
      expect_stats: z.boolean().optional(),
      expect_queries: z.boolean().optional(),
    }),
    metadata: scenarioMetadataSchema,
    rerun: z
      .strictObject({
        existing_queries: z.array(existingQuerySummarySchema),
        criteria: z.array(samplingCriterionSchema),
      })
      .optional(),
  });

const kiFeatureExtractionScenarioSchema: z.ZodType<
  WithoutSnapshotSource<KIFeatureExtractionScenario>
> = z.strictObject({
  input: z.strictObject({
    scenario_id: z.string(),
    log_query_filter: z.array(esQuerySchema).optional(),
  }),
  output: z.strictObject({
    criteria: z.array(samplingCriterionSchema),
    min_features: z.number().optional(),
    max_features: z.number().optional(),
    required_types: z.array(z.enum(VALID_KI_FEATURE_TYPES)).optional(),
    expect_entity_filters: z.boolean().optional(),
    expected_ground_truth: z.string(),
  }),
  metadata: scenarioMetadataSchema,
});

const kiFeatureExclusionScenarioSchema: z.ZodType<
  WithoutSnapshotSource<KIFeatureExclusionScenario>
> = z.strictObject({
  input: z.strictObject({
    scenario_id: z.string(),
    sample_document_count: z.number(),
    exclude_count: z.number(),
    follow_up_runs: z.number(),
  }),
});

const kiFeatureDeduplicationScenarioSchema: z.ZodType<
  WithoutSnapshotSource<KIFeatureDeduplicationScenario>
> = z.strictObject({
  input: z.strictObject({
    scenario_id: z.string(),
    iterations: z.number(),
  }),
});

const discoveryScenarioSchema: z.ZodType<WithoutSnapshotSource<DiscoveryScenario>> = z.strictObject(
  {
    input: z.strictObject({
      scenario_id: z.string(),
      stream_name: z.string(),
      detections: z.array(partialDetectionSchema),
      chronic_seed: chronicSeedSchema.optional(),
    }),
    continuationChains: z.record(z.string(), z.array(z.string())).optional(),
    memoryPages: z
      .array(
        z.strictObject({
          name: z.string(),
          title: z.string(),
          content: z.string(),
          categories: z.array(z.string()).optional(),
        })
      )
      .optional(),
    output: z.strictObject({
      criteria: z.array(samplingCriterionSchema),
      expected_min_evidence_count: z.number().optional(),
      expected_ground_truth: z.string().optional(),
      expected_confirmed_rule_uuids: z.record(z.string(), z.array(z.string())).optional(),
      expected_significant_events: z.array(partialSignificantEventSchema),
    }),
    metadata: scenarioMetadataSchema,
  }
);

export const datasetManifestSchema: z.ZodType<DatasetManifest> = z.strictObject({
  schema_version: z.literal(GROUND_TRUTH_SCHEMA_VERSION),
  id: z.string().min(1),
  description: z.string(),
});

export const groundTruthSliceSchema: z.ZodType<GroundTruthSlice> = z.strictObject({
  schema_version: z.literal(GROUND_TRUTH_SCHEMA_VERSION),
  dataset: z.string().min(1),
  snapshot: z.string().min(1),
  kiQueryGeneration: z.array(kiQueryGenerationScenarioSchema).optional(),
  kiFeatureExtraction: z.array(kiFeatureExtractionScenarioSchema).optional(),
  kiFeatureExclusion: z.array(kiFeatureExclusionScenarioSchema).optional(),
  kiFeatureDeduplication: z.array(kiFeatureDeduplicationScenarioSchema).optional(),
  discovery: z.array(discoveryScenarioSchema).optional(),
});
