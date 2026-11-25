/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/core-data-streams-server';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { EvaluationIndices } from '@kbn/evals-common';

/**
 * Holds two document kinds, discriminated by `doc_kind`: one `pointer` per pin (the
 * latest pointer for a suite/model is the active baseline) and the pinned execution's
 * score documents (`score`), snapshotted so paired comparisons survive the 90-day
 * retention on the scores data stream: baselines are retained for a year, ample for a
 * monthly re-pin cadence while still bounding growth.
 *
 * The mapping deliberately indexes only what this stream is queried on, instead of
 * mirroring the scores stream's mapping (which would couple two independently versioned
 * templates): the registry's filter and sort fields, plus the fields the long-term
 * score dashboards aggregate on (score per evaluator over time, split by task model and
 * dataset). Everything else in a snapshotted score document stays unindexed in
 * `_source`, which is all the compare flow reads.
 */
const pinnedBaselinesMappings = {
  properties: {
    '@timestamp': { type: 'date' },
    doc_kind: { type: 'keyword' },
    space_ids: { type: 'keyword' },
    baseline: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        suite_id: { type: 'keyword' },
        execution_id: { type: 'keyword' },
        judge_model_id: { type: 'keyword' },
        pinned_at: { type: 'date' },
        pinned_by: { type: 'keyword' },
        reason: { type: 'text', index: false },
        score_count: { type: 'integer' },
        dataset_ids: { type: 'keyword' },
      },
    },
    metadata: {
      type: 'object',
      properties: {
        execution_id: { type: 'keyword' },
        suite_id: { type: 'keyword' },
      },
    },
    example: {
      type: 'object',
      properties: {
        dataset: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            name: { type: 'keyword' },
          },
        },
      },
    },
    task: {
      type: 'object',
      properties: {
        model: {
          type: 'object',
          properties: {
            id: { type: 'keyword' },
            family: { type: 'keyword' },
            provider: { type: 'keyword' },
          },
        },
      },
    },
    evaluator: {
      type: 'object',
      properties: {
        name: { type: 'keyword' },
        kind: { type: 'keyword' },
        score: { type: 'float' },
      },
    },
  },
} as unknown as MappingsDefinition;

export const pinnedBaselinesDataStreamDefinition: DataStreamDefinition<MappingsDefinition> = {
  name: EvaluationIndices.PINNED_BASELINES,
  version: 1,
  hidden: true,
  template: {
    lifecycle: {
      data_retention: '365d',
    },
    settings: {
      refresh_interval: '5s',
    },
    mappings: pinnedBaselinesMappings,
  },
};
