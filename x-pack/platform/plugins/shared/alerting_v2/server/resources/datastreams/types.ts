/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesDataStreamLifecycleWithRollover,
  IngestProcessorContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { MappingsDefinition } from '@kbn/es-mappings';

export interface IngestPipelineDefinition {
  id: string;
  version: number;
  processors: IngestProcessorContainer[];
}

export interface ResourceDefinition {
  key: string;
  dataStreamName: string;
  version: number;
  mappings: MappingsDefinition;
  lifecycle: IndicesDataStreamLifecycleWithRollover;
  finalPipeline: IngestPipelineDefinition;
  /**
   * Deletes the existing data stream on startup when it was created from an index template at or
   * below `version`, for mapping changes that cannot be applied in place. Its documents are lost.
   * Must stay below the resource `version`; `DatastreamInitializer` rejects the definition otherwise.
   */
  forceReset?: { version: number };
}
