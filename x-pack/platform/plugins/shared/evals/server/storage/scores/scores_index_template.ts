/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamDefinition } from '@kbn/core-data-streams-server';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { EvaluationIndices, evaluationScoreMappingProperties } from '@kbn/evals-common';

// The properties live in the contract package so the pinned-baselines data stream in the
// agent_builder plugin indexes the snapshotted score documents identically.
const evaluationsDataStreamMappings = {
  properties: evaluationScoreMappingProperties,
} as unknown as MappingsDefinition;

export const evaluationsDataStreamDefinition: DataStreamDefinition<MappingsDefinition> = {
  name: EvaluationIndices.SCORES,
  version: 5,
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
