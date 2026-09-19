/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesIndexMode } from '@elastic/elasticsearch/lib/api/types';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
import type { IngestStreamEffectiveLifecycle, Streams } from '@kbn/streams-schema';

/**
 * Destination types targeted by V1. Only `elasticsearch` is backed by real
 * data today; `s3` and `remote_elasticsearch` land with the destinations
 * backend (see https://github.com/elastic/ingest-dev/issues/8131 and /8340).
 */
export type DestinationType = 'elasticsearch' | 's3' | 'remote_elasticsearch';

/**
 * View model for a row of the Destinations table, decoupled from
 * `ListStreamDetail` so the fetch actor and mapper are the only places to
 * update once the destinations CRUD API replaces the streams list endpoint.
 */
export interface Destination {
  name: string;
  type: DestinationType;
  description: string;
  tags: string[];
  isManaged: boolean;
  isInternal: boolean;
  hasDataStream: boolean;
  canReadFailureStore: boolean;
  /** Undefined when the destination has no meaningful retention. */
  retention: IngestStreamEffectiveLifecycle | undefined;
  /**
   * Numeric retention used for sorting; Infinity for indefinite retention and
   * undefined when it cannot be determined (ILM, unparseable duration).
   */
  retentionMs: number | undefined;
  /** Backing stream definition, powering stream-based actions like Discover. */
  streamDefinition: Streams.ClassicStream.Definition;
  indexMode: IndicesIndexMode;
}

/** Destination enriched with the metrics the sortable columns need. */
export type DestinationRow = Destination & {
  documentsCount: number;
  ingestionRate: number;
  storageBytes: number;
  dataQuality?: QualityIndicators;
};
