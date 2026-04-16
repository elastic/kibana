/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryNode } from '@kbn/agent-builder-common';

interface PostRetrievalConfig {
  deduplicate: boolean;
  lowConfidenceRejection: {
    enabled: boolean;
    threshold: number;
  };
}

interface PostRetrievalContext {
  method: string;
  logger: Logger;
}

/**
 * Apply post-retrieval processing steps to the retrieved memories.
 *
 * Steps are applied in order:
 * 1. Deduplication (naive word-overlap based)
 * 2. Low-confidence rejection (filter by confidence/similarity threshold)
 */
export const applyPostRetrieval = (
  nodes: MemoryNode[],
  _query: string,
  config: PostRetrievalConfig,
  ctx: PostRetrievalContext
): MemoryNode[] => {
  let result = nodes;

  if (config.deduplicate) {
    const before = result.length;
    result = deduplicate(result);
    if (result.length < before) {
      ctx.logger.info(`post-retrieval: deduplicated ${before} → ${result.length} memories`);
    }
  }

  if (config.lowConfidenceRejection.enabled) {
    const before = result.length;
    result = rejectLowConfidence(result, config.lowConfidenceRejection.threshold, ctx);
    if (result.length < before) {
      ctx.logger.info(`post-retrieval: rejected ${before - result.length} low-confidence memories (threshold=${config.lowConfidenceRejection.threshold})`);
    }
  }

  return result;
};

/**
 * Naive deduplication: remove memories whose summaries are very similar
 * to an earlier memory in the list (Jaccard similarity > 0.8).
 *
 * Keeps the first occurrence (higher-ranked after reranking).
 */
const deduplicate = (nodes: MemoryNode[]): MemoryNode[] => {
  const result: MemoryNode[] = [];
  const seenWordSets: Set<string>[] = [];

  for (const node of nodes) {
    const words = new Set(node.summary.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

    let isDuplicate = false;
    for (const seen of seenWordSets) {
      const intersection = new Set([...words].filter((w) => seen.has(w)));
      const union = new Set([...words, ...seen]);
      const jaccard = union.size > 0 ? intersection.size / union.size : 0;

      if (jaccard > 0.8) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      result.push(node);
      seenWordSets.push(words);
    }
  }

  return result;
};

/**
 * Reject low-confidence memories.
 *
 * For hybrid/semantic methods: reject where confidence < threshold.
 * For bm25-only: reject where confidence < threshold (same behavior,
 * since we don't have separate vector similarity scores at this layer).
 *
 * The threshold is configurable (default 0.5).
 */
const rejectLowConfidence = (
  nodes: MemoryNode[],
  threshold: number,
  ctx: PostRetrievalContext
): MemoryNode[] => {
  return nodes.filter((node) => {
    const score = node.confidence ?? 0;
    if (score < threshold) {
      ctx.logger.debug(
        `post-retrieval: rejecting memory ${node.id} (confidence=${score.toFixed(2)} < ${threshold})`
      );
      return false;
    }
    return true;
  });
};
