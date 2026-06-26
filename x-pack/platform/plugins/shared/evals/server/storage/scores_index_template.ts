/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/core-data-streams-server';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { EvaluationIndices } from '@kbn/evals-common';

const evaluationsDataStreamMappings = {
  properties: {
    '@timestamp': { type: 'date' },
    experiment_id: { type: 'keyword' },
    experiment_name: { type: 'keyword' },
    metadata: {
      type: 'object',
      properties: {
        execution_id: { type: 'keyword' },
        suite_id: { type: 'keyword' },
        total_repetitions: { type: 'integer' },
        hostname: { type: 'keyword' },
        git: {
          type: 'object',
          properties: {
            branch: { type: 'keyword' },
            commit_sha: { type: 'keyword' },
          },
        },
        ci: {
          type: 'object',
          properties: {
            build_id: { type: 'keyword' },
            job_id: { type: 'keyword' },
            build_url: { type: 'keyword' },
            pipeline_slug: { type: 'keyword' },
            pull_request: { type: 'keyword' },
            branch: { type: 'keyword' },
            commit: { type: 'keyword' },
          },
        },
      },
    },
    example: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        index: { type: 'integer' },
        input: { type: 'object', enabled: false },
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
        trace_id: { type: 'keyword' },
        repetition_index: { type: 'integer' },
        output: { type: 'object', enabled: false },
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
        score: { type: 'float' },
        label: { type: 'keyword' },
        explanation: { type: 'text', index: false },
        metadata: { type: 'flattened' },
        trace_id: { type: 'keyword' },
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
  },
} as unknown as MappingsDefinition;

export const evaluationsDataStreamDefinition: DataStreamDefinition<MappingsDefinition> = {
  name: EvaluationIndices.SCORES,
  version: 1,
  hidden: true,
  template: {
    lifecycle: {
      data_retention: '90d',
    },
    settings: {
      refresh_interval: '5s',
    },
    mappings: evaluationsDataStreamMappings,
  },
};
