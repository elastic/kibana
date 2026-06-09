/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/streams-schema';
import { isDefinitionNotFoundError } from '../errors/definition_not_found_error';
import type { FeatureClient } from '../feature/feature_client';
import type { StreamsClient } from '../client';

/**
 * Options shared by the per-class list methods on
 * `StreamsKnowledgeIndicatorsReader`. Kept deliberately small: this surface
 * only exposes knobs cross-plugin consumers should reach for. Pagination,
 * excluded-feature inclusion, and arbitrary type selection are NOT exposed
 * — those are properties of the internal `FeatureClient` that the integration
 * has no business depending on.
 */
export interface StreamsKnowledgeIndicatorsListOptions {
  /**
   * Drops features below the given confidence (0–100). Entity store should
   * pass its configured threshold here so changes are honored without code
   * changes. Omit to receive every confidence level.
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
   * Lists `type: 'entity'` Knowledge Indicators across all streams the
   * caller is authorized to read. Filters are pushed into the underlying
   * storage query — they are not applied client-side.
   */
  listEntityFeatures(options?: StreamsKnowledgeIndicatorsListOptions): Promise<Feature[]>;

  /**
   * Lists `type: 'dependency'` Knowledge Indicators across all streams the
   * caller is authorized to read. Each dependency feature carries
   * `properties.source`, `properties.target`, and `properties.protocol`
   * naming the two endpoints of a relationship. Filters are pushed into
   * the underlying storage query — they are not applied client-side.
   */
  listDependencyFeatures(options?: StreamsKnowledgeIndicatorsListOptions): Promise<Feature[]>;

  /**
   * Lists `type: 'schema'` Knowledge Indicators across all streams the caller
   * is authorized to read. Schema features describe the log schema family
   * evident in a stream (`properties.schema_family` ∈ `'ecs' | 'otel' |
   * 'custom'`). Cross-plugin consumers (currently entity_store) read these
   * to discover which streams carry entity-identity fields, and for their
   * `properties.ecs_identity_aliases` table when present.
   *
   * Filters are pushed into the underlying storage query — they are not
   * applied client-side.
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

  const listFeaturesOfType = async (
    type: 'entity' | 'dependency' | 'schema',
    options?: StreamsKnowledgeIndicatorsListOptions
  ): Promise<Feature[]> => {
    const streams = await streamsClient.listStreams();
    const streamNames = streams.map((stream) => stream.name);
    if (streamNames.length === 0) {
      return [];
    }
    const { hits } = await featureClient.getFeatures(streamNames, {
      type: [type],
      minConfidence: options?.minConfidence,
    });
    return hits;
  };

  return {
    listEntityFeatures: (options) => listFeaturesOfType('entity', options),
    listDependencyFeatures: (options) => listFeaturesOfType('dependency', options),
    listSchemaFeatures: (options) => listFeaturesOfType('schema', options),

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
