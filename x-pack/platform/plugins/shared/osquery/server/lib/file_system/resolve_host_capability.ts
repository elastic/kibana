/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * Read-only index pattern for Elastic Defend (Endpoint) host metadata. Used to
 * map a Fleet agent id to the host's endpoint id and to detect whether the host
 * is Endpoint-capable. We do NOT add a `security_solution` plugin dependency
 * (it already depends on osquery, which would risk a cycle) — a direct read of
 * the metadata data stream is the clean, dependency-free transport.
 */
export const ENDPOINT_METADATA_INDEX_PATTERN = 'metrics-endpoint.metadata-*';

/**
 * The resolved verdict for a selected host. The Fleet agent id is used for
 * Osquery browse; `endpointId` (when present) is used for Endpoint act-verbs.
 */
export interface HostCapabilityVerdict {
  agentId: string;
  endpointCapable: boolean;
  endpointId?: string;
}

/**
 * Resolves a host's capability and id mapping with a single endpoint
 * host-metadata lookup keyed by the Fleet agent id.
 *
 * - Found  -> the host runs Elastic Defend; returns its endpoint id and marks it
 *             Endpoint-capable (act-verbs available).
 * - Not found -> the host is Osquery-only; no endpoint id, not Endpoint-capable
 *             (browse still works via Osquery).
 *
 * The lookup is deliberately tolerant: any error (missing index on a stack with
 * no Defend installs, permission issue) collapses to "not Endpoint-capable"
 * rather than failing the whole host selection — browsing must still work.
 */
export const resolveHostCapability = async (
  esClient: ElasticsearchClient,
  agentId: string
): Promise<HostCapabilityVerdict> => {
  try {
    const result = await esClient.search<{ agent?: { id?: string } }>({
      index: ENDPOINT_METADATA_INDEX_PATTERN,
      ignore_unavailable: true,
      size: 1,
      // Most-recent metadata doc for this Fleet agent.
      query: {
        bool: {
          filter: [{ term: { 'agent.id': agentId } }],
        },
      },
      sort: [{ 'event.created': { order: 'desc' } }],
      _source: ['agent.id'],
    });

    const hit = result.hits.hits[0];
    const endpointId = hit?._source?.agent?.id;

    if (endpointId) {
      return { agentId, endpointCapable: true, endpointId };
    }
  } catch {
    // fall through to osquery-only verdict
  }

  return { agentId, endpointCapable: false };
};
