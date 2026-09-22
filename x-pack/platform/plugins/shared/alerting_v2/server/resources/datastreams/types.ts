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
  lifecycle: IndicesDataStreamLifecycleWithRollover;
  /**
   * When set: if a data stream exists with a deployed index-template version strictly below
   * this number AND the `episode` field is still mapped as a real object (not an alias), the
   * data stream is wiped and reinitialized on startup.
   *
   * One-time only: once the deployed version reaches `version` this condition can never be
   * true again. Use only for schema renames that have no in-place migration path.
   */
  destroyOnVersionBelow?: number;
}
