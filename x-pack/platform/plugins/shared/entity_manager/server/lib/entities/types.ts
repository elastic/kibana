/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesIndexTemplate,
  TransformGetTransformStatsTransformStats,
} from '@elastic/elasticsearch/lib/api/types';
import { EntityDefinition } from '@kbn/entities-schema';

interface TransformState {
  id: string;
  installed: boolean;
  running: boolean;
  stats?: TransformGetTransformStatsTransformStats;
}

interface IngestPipelineState {
  id: string;
  installed: boolean;
  stats?: { count: number; failed: number };
}

interface IndexTemplateState {
  id: string;
  installed: boolean;
  stats?: IndicesIndexTemplate;
}

// state is the *live* state of the definition. since a definition
// is composed of several elasticsearch components that can be
// modified or deleted outside of the entity manager apis, this can
// be used to verify the actual installation is complete and running
export interface EntityDefinitionState {
  installed: boolean;
  running: boolean;
  components: {
    transforms: TransformState[];
    ingestPipelines: IngestPipelineState[];
    indexTemplates: IndexTemplateState[];
  };
}

export type EntityDefinitionWithState = EntityDefinition & { state: EntityDefinitionState };
