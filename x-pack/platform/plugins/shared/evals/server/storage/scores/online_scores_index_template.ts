/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/core-data-streams-server';
import { mappings, type MappingsDefinition } from '@kbn/es-mappings';
import { EvaluationIndices } from '@kbn/evals-common';

const onlineScoresDataStreamMappings = {
  properties: {
    '@timestamp': { type: 'date' },
    space_ids: { type: 'keyword' },
    monitor: {
      type: 'object',
      properties: {
        id: { type: 'keyword' },
        name: { type: 'keyword' },
      },
    },
    trace_id: { type: 'keyword' },
    connector_id: { type: 'keyword' },
    evaluator: {
      type: 'object',
      properties: {
        name: { type: 'keyword' },
        version: { type: 'keyword' },
        kind: { type: 'keyword' },
      },
    },
    score: {
      type: 'object',
      properties: {
        name: { type: 'keyword' },
        value: { type: 'float' },
        label: { type: 'keyword' },
        explanation: mappings.text({ index: false, fields: undefined }),
        metadata: { type: 'flattened' },
      },
    },
  },
} satisfies MappingsDefinition;

export const onlineScoresDataStreamDefinition: DataStreamDefinition<MappingsDefinition> = {
  name: EvaluationIndices.ONLINE_SCORES,
  version: 2,
  hidden: true,
  template: {
    lifecycle: {
      data_retention: '90d',
    },
    settings: {
      refresh_interval: '5s',
    },
    mappings: onlineScoresDataStreamMappings,
  },
};
