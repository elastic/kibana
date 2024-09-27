/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  IndicesGetIndexTemplateIndexTemplateItem,
  TransformGetTransformStatsTransformStats,
  TransformGetTransformTransformSummary,
} from '@elastic/elasticsearch/lib/api/types';
import { BooleanFromString } from '@kbn/zod-helpers';
import { entityDefinitionSchema } from '../../schema/entity_definition';

export const findEntityDefinitionQuerySchema = z.object({
  page: z.optional(z.coerce.number()),
  perPage: z.optional(z.coerce.number()),
  includeState: z.optional(BooleanFromString).default(false),
});

export type FindEntityDefinitionQuery = z.infer<typeof findEntityDefinitionQuerySchema>;

export const entitiyDefinitionWithStateSchema = entityDefinitionSchema.extend({
  state: z.object({
    installed: z.boolean(),
    running: z.boolean(),
  }),
  stats: z.object({
    entityCount: z.number(),
    totalDocs: z.number(),
    lastSeenTimestamp: z.string().or(z.null()),
  }),
});

interface IngestPipelineState {
  id: string;
  installed: boolean;
  stats: {
    count: number;
    failed: number;
  };
}

interface IndexTemplateState {
  id: string;
  installed: boolean;
  template: IndicesGetIndexTemplateIndexTemplateItem;
}

interface TransformState {
  id: string;
  installed: boolean;
  running: boolean;
  summary: TransformGetTransformTransformSummary;
  stats: TransformGetTransformStatsTransformStats;
}

export type EntityDefinitionWithState = z.infer<typeof entitiyDefinitionWithStateSchema> & {
  resources: {
    ingestPipelines: IngestPipelineState[];
    indexTemplates: IndexTemplateState[];
    transforms: TransformState[];
  };
};

export const entityDefintionResponseSchema = z.object({
  definitions: z.array(entitiyDefinitionWithStateSchema),
});

export interface EntityDefintionResponse {
  definitions: EntityDefinitionWithState[];
}
