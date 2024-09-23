/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  IngestGetPipelineResponse,
  TransformGetTransformStatsTransformStats,
  TransformGetTransformTransformSummary,
} from '@elastic/elasticsearch/lib/api/types';
import { entityDefinitionSchema } from '../../schema/entity_definition';

export const findEntityDefinitionQuerySchema = z.object({
  page: z.optional(z.coerce.number()),
  perPage: z.optional(z.coerce.number()),
});

export type FindEntityDefinitionQuery = z.infer<typeof findEntityDefinitionQuerySchema>;

export const entitiyDefinitionWithStateSchema = entityDefinitionSchema.extend({
  state: z.object({
    installed: z.boolean(),
    running: z.boolean(),
    avgCheckpointDuration: z.object({
      history: z.number().or(z.null()),
      latest: z.number().or(z.null()),
    }),
  }),
  stats: z.object({
    entityCount: z.number(),
    totalDocs: z.number(),
    lastSeenTimestamp: z.string().or(z.null()),
  }),
});

export type EntityDefinitionWithState = z.infer<typeof entitiyDefinitionWithStateSchema> & {
  state: {
    resources: {
      ingestPipelines: IngestGetPipelineResponse;
      transforms: {
        history?: TransformGetTransformTransformSummary;
        latest?: TransformGetTransformTransformSummary;
        stats: {
          history?: TransformGetTransformStatsTransformStats;
          latest?: TransformGetTransformStatsTransformStats;
        };
      };
    };
  };
};

export const entityDefintionResponseSchema = z.object({
  definitions: z.array(entitiyDefinitionWithStateSchema),
});

export interface EntityDefintionResponse {
  definitions: EntityDefinitionWithState[];
}
