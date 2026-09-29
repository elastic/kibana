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
   * When true: on startup, checks whether `episode.id` is still a real object field in the
   * live mapping. If so, the data stream is wiped and reinitialized — the episode→alert field
   * rename cannot be applied in place because ES rejects object→alias mapping changes.
   *
   * The check is idempotent: once `episode.id` is an alias the gate never fires again,
   * regardless of deployed template version. This also prevents false-positives if another
   * PR increments the version number before this migration ships.
   */
  episodeToAlertMigration?: true;
}
