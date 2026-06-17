/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATASET_ANALYSIS_FEATURE_TYPE, type Feature } from '@kbn/streams-schema';
import { isDefinitionNotFoundError } from '../errors/definition_not_found_error';
import type { FeatureClient } from '../feature/feature_client';
import type { StreamsClient } from '../client';

/**
 * Options for the inferred (LLM-emitted) feature-class list methods on
 * `StreamsKnowledgeIndicatorsReader`. Kept deliberately small: only knobs
 * cross-plugin consumers should reach for. Pagination, excluded-feature
 * inclusion, and arbitrary type selection are NOT exposed.
 */
export interface StreamsKnowledgeIndicatorsListOptions {
  /**
   * Drops features below the given confidence (0–100). Omit to receive every
   * confidence level. Pushed into the underlying storage query.
   */
  minConfidence?: number;
}

/**
 * Read-only Knowledge Indicators surface intentionally narrowed for
 * cross-plugin consumers (currently Entity Store v2's KI integration).
 *
 * Design constraints:
 * - One method per feature class the integration consumes. No `type` filter
 *   is exposed to callers; each method hardwires its single value so a
 *   future consumer cannot accidentally read feature classes outside the
 *   integration's scope through this surface.
 * - No `limit` and no `includeExcluded`. Excluded features must never be
 *   returned here, and pagination is an internal concern of the underlying
 *   storage client.
 * - Stale / expired features are filtered server-side by the underlying
 *   `FeatureClient` defaults; this surface inherits that behavior.
 *
 * If a future use case genuinely needs broader access, extend this interface
 * with another narrow, intent-named method rather than adding escape hatches
 * to the existing methods.
 */
export interface StreamsKnowledgeIndicatorsReader {
  /**
   * Lists `type: 'dataset_analysis'` Knowledge Indicators across all streams
   * the caller is authorized to read. `dataset_analysis` is a deterministic,
   * computed feature emitted once per analyzed stream; its
   * `properties.analysis.fields` is an object keyed by
   * `"<field.path> (<es_types>)"` (e.g. `"user.email (keyword)"`) with sampled
   * value distributions. Cross-plugin consumers (currently entity_store) read
   * these to discover which streams carry entity-identity fields and at which
   * ES type. The `type` filter is pushed into the underlying storage query.
   */
  listDatasetAnalysisFeatures(): Promise<Feature[]>;

  /**
   * Lists `type: 'schema'` Knowledge Indicators across all streams the caller
   * is authorized to read. Schema features are LLM-inferred and may carry
   * `properties.identity_classification` (`{ confidence_tier, namespace }`),
   * which the entity store's user confidence-classification channel reads to
   * stamp `entity.namespace` / `entity.confidence`. This is the semantic
   * channel, distinct from the deterministic `dataset_analysis` source-discovery
   * channel above. Filters are pushed into the underlying storage query.
   */
  listSchemaFeatures(options?: StreamsKnowledgeIndicatorsListOptions): Promise<Feature[]>;

  /**
   * Resolves a stream name to the Elasticsearch index pattern(s) backing it.
   *
   * For wired streams the stream name equals the data-stream name, and
   * Elasticsearch resolves the data-stream name in `FROM` clauses, so a
   * single-element array `[streamName]` is sufficient. For classic
   * (unmanaged) streams the same convention holds — the stream is itself
   * the pre-existing data stream.
   *
   * Returns an empty array when the stream does not exist (rather than
   * throwing) so callers can skip missing streams without try/catch.
   */
  resolveIndexPatterns(streamName: string): Promise<string[]>;
}

/**
 * Builds a `StreamsKnowledgeIndicatorsReader` over already-scoped underlying
 * clients. Pass the `FeatureClient` and `StreamsClient` you obtained from
 * the streams plugin's `getScopedClients({ request })` (or, for tests, mocks
 * matching the same interface).
 */
export const createKnowledgeIndicatorsReader = (deps: {
  featureClient: FeatureClient;
  streamsClient: StreamsClient;
}): StreamsKnowledgeIndicatorsReader => {
  const { featureClient, streamsClient } = deps;

  return {
    listDatasetAnalysisFeatures: async () => {
      const streams = await streamsClient.listStreams();
      const streamNames = streams.map((stream) => stream.name);
      if (streamNames.length === 0) {
        return [];
      }
      const { hits } = await featureClient.getFeatures(streamNames, {
        type: [DATASET_ANALYSIS_FEATURE_TYPE],
      });
      return hits;
    },

    listSchemaFeatures: async (options) => {
      const streams = await streamsClient.listStreams();
      const streamNames = streams.map((stream) => stream.name);
      if (streamNames.length === 0) {
        return [];
      }
      const { hits } = await featureClient.getFeatures(streamNames, {
        type: ['schema'],
        minConfidence: options?.minConfidence,
      });
      return hits;
    },

    resolveIndexPatterns: async (streamName) => {
      try {
        await streamsClient.getStream(streamName);
      } catch (error) {
        if (isDefinitionNotFoundError(error)) {
          return [];
        }
        throw error;
      }
      // Wired and classic streams alike: the stream name resolves directly to
      // its backing data-stream pattern. Future variants (e.g. group streams
      // composing multiple data streams) can extend this without breaking
      // callers that only care about the array shape.
      return [streamName];
    },
  };
};
