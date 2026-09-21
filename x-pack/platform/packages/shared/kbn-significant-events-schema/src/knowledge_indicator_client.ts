/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from './feature';

/**
 * The subset of the Knowledge Indicator client that streams-core depends on
 * (stream-deletion cleanup and partition-suggestion feature lookup).
 *
 * This contract lives in the schema package so streams-core can depend on it
 * type-only, without importing the concrete `KnowledgeIndicatorClient`
 * implementation — which keeps the dependency one-way once that implementation
 * moves into the significantEvents plugin. The concrete client is structurally
 * assignable to this contract.
 */
export interface KnowledgeIndicatorClientContract {
  /** Delete all significant-events queries linked to a source (streams pass the stream name). */
  deleteAllQueries(sourceId: string): Promise<unknown>;
  /** Delete all knowledge indicators linked to a source. */
  deleteIndicators(sourceId: string): Promise<unknown>;
  /** Fetch knowledge-indicator features for one or more sources. */
  getFeatures(
    sourceIds: string | string[],
    options?: {
      type?: string[];
      id?: string[];
      minConfidence?: number;
      limit?: number;
      includeExcluded?: boolean;
    }
  ): Promise<{ hits: Feature[] }>;
}
