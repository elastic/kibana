/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MemoryNode, MemoryEdgeType, MemoryLink } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';

/**
 * Options for the getNeighbors() traversal.
 */
export interface GetNeighborsOptions {
  /**
   * Maximum BFS depth. Defaults to 2.
   * Depth 1 = direct neighbors only.
   */
  depth?: number;

  /**
   * If provided, only traverse edges of these types.
   * If omitted, all edge types are traversed.
   */
  edgeTypes?: MemoryEdgeType[];

  /**
   * Maximum number of neighbor nodes to return across all depths. Defaults to 10.
   */
  maxResults?: number;

  /**
   * When true, populate the `full` field of each returned node.
   * Defaults to false (compact mode: only `id`, `summary`, `type`, `links` etc).
   */
  includeFull?: boolean;
}

/**
 * A single node + edge record in the flat subgraph result.
 */
export interface SubgraphEdge {
  from_id: string;
  to_id: string;
  type: MemoryEdgeType;
  weight: number;
}

/**
 * Result of getSubgraph(): all nodes and edges reachable from a root node.
 */
export interface Subgraph {
  nodes: MemoryNode[];
  edges: SubgraphEdge[];
}

/** Small score increment applied when a memory is accessed via graph traversal. */
const ACCESS_BUMP = 0.02;

/**
 * GraphTraversalService provides BFS-based graph traversal over memory nodes.
 *
 * It depends on a MemoryClient to fetch nodes, and applies access-bump side effects
 * to track how often graph neighbors are visited.
 */
export class GraphTraversalService {
  private readonly client: MemoryClient;
  private readonly logger: Logger;

  constructor({ client, logger }: { client: MemoryClient; logger: Logger }) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Return the neighbors of `nodeId` up to `opts.depth` hops away.
   *
   * Algorithm:
   * - BFS starting from `nodeId`; the root node itself is NOT included in results
   * - At each level, expand edges (filtered by edgeTypes if provided)
   * - Sort each expansion level by edge weight descending before enqueueing
   * - Deduplicate: never revisit a node already seen (cycle prevention)
   * - Apply a tiny reinforcement bump to each returned node (access tracking)
   * - Cap total results at `maxResults`
   */
  async getNeighbors(nodeId: string, opts: GetNeighborsOptions = {}): Promise<MemoryNode[]> {
    const { depth = 2, edgeTypes, maxResults = 10, includeFull = false } = opts;

    const visited = new Set<string>([nodeId]);
    const results: MemoryNode[] = [];

    // BFS queue entries: { id, remainingDepth }
    let currentLevel: Array<{ id: string; weight: number }> = [];

    // Seed: fetch root node and collect its outgoing edges for the first BFS level
    let rootNode: MemoryNode;
    try {
      rootNode = await this.client.get(nodeId);
    } catch (err) {
      this.logger.warn(
        `GraphTraversalService.getNeighbors: root node ${nodeId} not found — ${
          (err as Error).message
        }`
      );
      return [];
    }

    // Collect direct links from root, filtered by edgeTypes and sorted by weight desc
    const rootLinks = this.filterAndSortLinks(rootNode.links, edgeTypes);
    currentLevel = rootLinks.map((l) => ({ id: l.target_id, weight: l.weight }));

    let remainingDepth = depth;

    while (currentLevel.length > 0 && remainingDepth > 0 && results.length < maxResults) {
      const nextLevel: Array<{ id: string; weight: number }> = [];

      for (const entry of currentLevel) {
        if (results.length >= maxResults) {
          break;
        }

        if (visited.has(entry.id)) {
          continue;
        }
        visited.add(entry.id);

        let node: MemoryNode;
        try {
          node = await this.client.get(entry.id);
        } catch (err) {
          this.logger.warn(
            `GraphTraversalService.getNeighbors: could not fetch neighbor ${entry.id} — ${
              (err as Error).message
            }`
          );
          continue;
        }

        // Apply access bump (best-effort, non-blocking)
        this.applyAccessBump(node).catch((err: Error) => {
          this.logger.warn(`Access bump failed for ${node.id}: ${err.message}`);
        });

        // Add to results, stripping `full` if compact mode
        if (includeFull) {
          results.push(node);
        } else {
          results.push(this.toCompact(node));
        }

        // Collect next-level links from this neighbor (for next BFS iteration)
        if (remainingDepth > 1) {
          const neighborLinks = this.filterAndSortLinks(node.links, edgeTypes);
          for (const link of neighborLinks) {
            if (!visited.has(link.target_id)) {
              nextLevel.push({ id: link.target_id, weight: link.weight });
            }
          }
        }
      }

      // Sort next level by weight desc before advancing
      nextLevel.sort((a, b) => b.weight - a.weight);
      currentLevel = nextLevel;
      remainingDepth--;
    }

    return results;
  }

  /**
   * Return a subgraph rooted at `nodeId` for admin/debug purposes.
   *
   * This performs a full BFS up to `depth` and collects all reachable nodes and edges.
   * Unlike getNeighbors(), the root IS included in the result, and no access bumps are applied.
   */
  async getSubgraph(
    nodeId: string,
    depth: number = 2,
    edgeTypes?: MemoryEdgeType[]
  ): Promise<Subgraph> {
    const visited = new Set<string>();
    const nodes: MemoryNode[] = [];
    const edges: SubgraphEdge[] = [];

    // BFS using a queue of { id, remainingDepth }
    const queue: Array<{ id: string; remainingDepth: number }> = [
      { id: nodeId, remainingDepth: depth },
    ];

    while (queue.length > 0) {
      const entry = queue.shift()!;

      if (visited.has(entry.id)) {
        continue;
      }
      visited.add(entry.id);

      let node: MemoryNode;
      try {
        node = await this.client.get(entry.id);
      } catch (err) {
        this.logger.warn(
          `GraphTraversalService.getSubgraph: could not fetch node ${entry.id} — ${
            (err as Error).message
          }`
        );
        continue;
      }

      nodes.push(node);

      if (entry.remainingDepth > 0) {
        const links = this.filterAndSortLinks(node.links, edgeTypes);
        for (const link of links) {
          edges.push({
            from_id: node.id,
            to_id: link.target_id,
            type: link.type,
            weight: link.weight,
          });

          if (!visited.has(link.target_id)) {
            queue.push({ id: link.target_id, remainingDepth: entry.remainingDepth - 1 });
          }
        }
      }
    }

    return { nodes, edges };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Filter links by edge type (if provided) and sort by weight descending. */
  private filterAndSortLinks(links: MemoryLink[], edgeTypes?: MemoryEdgeType[]): MemoryLink[] {
    const filtered =
      edgeTypes && edgeTypes.length > 0
        ? links.filter((l) => edgeTypes.includes(l.type))
        : links;

    return [...filtered].sort((a, b) => b.weight - a.weight);
  }

  /**
   * Apply a small access bump to a node: increment access_count and nudge
   * reinforcement_score by ACCESS_BUMP. Best-effort — errors are swallowed by caller.
   */
  private async applyAccessBump(node: MemoryNode): Promise<void> {
    const now = new Date().toISOString();
    await this.client.update({
      id: node.id,
      access_count: (node.access_count ?? 0) + 1,
      reinforcement_score: Math.min(1.0, (node.reinforcement_score ?? 0) + ACCESS_BUMP),
      recency: now,
      last_used_at: now,
    });
  }

  /**
   * Return a compact version of the node (omit `full` to save tokens).
   * All other fields are kept so callers can inspect status, links, scores, etc.
   */
  private toCompact(node: MemoryNode): MemoryNode {
    return {
      ...node,
      full: '',
    };
  }
}

/**
 * Factory function for dependency injection.
 */
export const createGraphTraversalService = ({
  client,
  logger,
}: {
  client: MemoryClient;
  logger: Logger;
}): GraphTraversalService => new GraphTraversalService({ client, logger });
