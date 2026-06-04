/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStreamLifecycleWithRollover } from '@elastic/elasticsearch/lib/api/types';
import type { MappingsDefinition } from '@kbn/es-mappings';

export interface ResourceDefinition {
  key: string;
  dataStreamName: string;
  version: number;
  mappings: MappingsDefinition;
  /**
   * Data Stream Lifecycle (DSL) configuration applied to the data stream's
   * index template. Use DSL instead of ILM so the same definition works on
   * both stateful and serverless deployments (`_ilm` APIs are not available
   * on serverless).
   *
   * An empty object enables DSL with cluster defaults (rollover only,
   * no retention). Set `data_retention` to auto-delete documents after
   * a duration.
   */
  lifecycle: IndicesDataStreamLifecycleWithRollover;
}
