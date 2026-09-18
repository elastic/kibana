/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { CAPABILITY_FIELD_TYPES } from './constants';

/**
 * Target capabilities for semantic log search.
 */
export interface TargetCapabilities {
  /** Whether the target has semantic search capability (pre-indexed embeddings) */
  hasSemanticCapability: boolean;
  /** Whether the target has exact template resolution (pattern_text) */
  hasPatternCapability: boolean;
}

/**
 * Detect capabilities for a target index/data stream/pattern.
 *
 * Uses the field_caps API to check if the target has semantic_text or pattern_text fields.
 * Returns false/false if the target does not exist or is not accessible.
 */
export async function detectCapabilities(
  esClient: ElasticsearchClient,
  target: string
): Promise<TargetCapabilities> {
  try {
    const response = await esClient.fieldCaps({
      index: target,
      fields: ['*'],
    });

    const fields = Object.values(response.fields);

    return {
      hasSemanticCapability: fields.some((field) => CAPABILITY_FIELD_TYPES.semantic in field),
      hasPatternCapability: fields.some((field) => CAPABILITY_FIELD_TYPES.pattern in field),
    };
  } catch (error) {
    // Target does not exist or is not accessible
    return {
      hasSemanticCapability: false,
      hasPatternCapability: false,
    };
  }
}

/** The default rerank inference endpoint available in ES 9.3+ */
const RERANK_ENDPOINT = '.rerank-v1-elasticsearch';

/**
 * Detect if the cluster has RERANK capability.
 *
 * Checks if the default rerank endpoint (.rerank-v1-elasticsearch) is available.
 * This endpoint is preconfigured in ES 9.3+ and enables runtime semantic ranking
 * via ES|QL RERANK command.
 */
export async function detectRerankCapability(esClient: ElasticsearchClient): Promise<boolean> {
  try {
    const response = await esClient.inference.get({ inference_id: RERANK_ENDPOINT });
    return (response.endpoints?.length ?? 0) > 0;
  } catch {
    // Endpoint doesn't exist or inference API not available
    return false;
  }
}
