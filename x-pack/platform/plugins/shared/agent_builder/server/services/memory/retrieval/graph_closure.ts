/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MemoryNode } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';

export interface GraphClosureConfig {
  enabled: boolean;
  maxDepth: number;
  maxExpanded: number;
}

/**
 * TeleMem-style backward closure expansion.
 *
 * After seed memories are retrieved (via BM25/semantic/hybrid), this step
 * follows graph links to pull in related memories that weren't in the
 * initial result set. This enriches context with causally/semantically
 * connected memories.
 *
 * Algorithm:
 * 1. Start with seed memories (retrieval results)
 * 2. For each seed, follow outgoing links (1-2 hops)
 * 3. Collect linked memories not already in the seed set
 * 4. Append them to the result (after seeds, preserving seed ranking)
 * 5. Cap total expanded nodes
 */
export const expandWithGraphClosure = async (
  seeds: MemoryNode[],
  memoryClient: MemoryClient,
  config: GraphClosureConfig,
  logger: Logger
): Promise<MemoryNode[]> => {
  if (!config.enabled || seeds.length === 0) {
    return seeds;
  }

  const { maxDepth, maxExpanded } = config;
  const seedIds = new Set(seeds.map((s) => s.id));
  const expanded: MemoryNode[] = [];
  const visited = new Set<string>(seedIds);

  // BFS from each seed, following links
  let frontier = seeds.flatMap((seed) =>
    seed.links
      .filter((l) => !visited.has(l.target_id))
      .map((l) => ({ targetId: l.target_id, depth: 1, weight: l.weight, sourceId: seed.id }))
  );

  // Sort frontier by link weight descending (best connections first)
  frontier.sort((a, b) => b.weight - a.weight);

  while (frontier.length > 0 && expanded.length < maxExpanded) {
    const nextFrontier: typeof frontier = [];

    for (const entry of frontier) {
      if (expanded.length >= maxExpanded) break;
      if (visited.has(entry.targetId)) continue;

      visited.add(entry.targetId);

      let node: MemoryNode;
      try {
        node = await memoryClient.get(entry.targetId);
      } catch {
        continue;
      }

      // Skip deprecated/suspect memories
      if (node.status === 'deprecated' || node.status === 'suspect') {
        continue;
      }

      expanded.push(node);

      // Continue expanding if within depth limit
      if (entry.depth < maxDepth) {
        for (const link of node.links) {
          if (!visited.has(link.target_id)) {
            nextFrontier.push({
              targetId: link.target_id,
              depth: entry.depth + 1,
              weight: link.weight * 0.7, // decay weight with depth
              sourceId: node.id,
            });
          }
        }
      }
    }

    frontier = nextFrontier.sort((a, b) => b.weight - a.weight);
  }

  if (expanded.length > 0) {
    logger.info(
      `graph-closure: expanded ${seeds.length} seeds → +${expanded.length} linked memories (depth=${maxDepth})`
    );
  }

  // Return seeds first (preserve original ranking), then expanded nodes
  return [...seeds, ...expanded];
};
