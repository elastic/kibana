/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { MemoryNode, MemoryLink, MemoryEdgeType } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';

/**
 * A single extracted relationship triplet.
 */
export interface ExtractedTriplet {
  subject: string;
  relationship: string;
  object: string;
  confidence: number;
}

/**
 * Result of triplet extraction: triplets + resolved links to existing memories.
 */
export interface TripletExtractionResult {
  triplets: ExtractedTriplet[];
  links: Array<{ fromId: string; link: MemoryLink }>;
}

const TRIPLET_SYSTEM_PROMPT = `You are a knowledge graph extraction assistant. Given a set of memory entries, extract entity-relationship triplets that connect them.

For each relationship you identify, output a triplet: (subject_memory_id, relationship_type, object_memory_id).

Relationship types to use:
- "related_to": general topical connection
- "applies_to": one memory provides context for another
- "derived_from": one memory is a more specific version of another
- "contradicts": two memories contain conflicting information
- "same_project": both memories relate to the same project/task
- "preference_cluster": both express related preferences
- "refines": one memory adds detail/nuance to another

Rules:
- Only create links between memories that have a meaningful semantic relationship.
- Each triplet must reference existing memory IDs from the provided list.
- confidence: 0.0–1.0 indicating how confident you are in the relationship.
- Do NOT create self-links (subject_id == object_id).
- Prefer fewer, higher-quality links over many weak ones.

Respond with ONLY valid JSON:
{
  "triplets": [
    { "subject": "memory_id_1", "relationship": "relationship_type", "object": "memory_id_2", "confidence": 0.8 }
  ]
}`;

export interface TripletExtractorDeps {
  inference: InferenceServerStart;
  connectorId: string;
  request: KibanaRequest;
  logger: Logger;
}

/**
 * Mem0g-style triplet extraction.
 *
 * After memories are created, this extractor:
 * 1. Loads newly created memories + a sample of existing related memories
 * 2. Asks an LLM to identify entity-relationship triplets between them
 * 3. Returns resolved links ready to be added via MemoryClient.addLink()
 *
 * This is a post-extraction step — it runs AFTER memories are persisted,
 * not during extraction. It enriches the graph structure.
 */
export class TripletExtractor {
  private readonly inference: InferenceServerStart;
  private readonly connectorId: string;
  private readonly request: KibanaRequest;
  private readonly logger: Logger;

  constructor({ inference, connectorId, request, logger }: TripletExtractorDeps) {
    this.inference = inference;
    this.connectorId = connectorId;
    this.request = request;
    this.logger = logger;
  }

  /**
   * Extract triplets from a set of newly created memories,
   * considering existing related memories for cross-linking.
   *
   * @param newMemories - memories just created in this round
   * @param memoryClient - client to search for related existing memories
   * @returns triplets and resolved links
   */
  async extract(
    newMemories: MemoryNode[],
    memoryClient: MemoryClient
  ): Promise<TripletExtractionResult> {
    if (newMemories.length === 0) {
      return { triplets: [], links: [] };
    }

    // Find related existing memories by searching for each new memory's summary
    const existingMemories = await this.findRelatedMemories(newMemories, memoryClient);

    // Combine new + existing for the LLM
    const allMemories = [...newMemories, ...existingMemories];

    // Deduplicate by ID
    const uniqueMemories = new Map<string, MemoryNode>();
    for (const m of allMemories) {
      uniqueMemories.set(m.id, m);
    }

    const memoryList = Array.from(uniqueMemories.values());

    if (memoryList.length < 2) {
      return { triplets: [], links: [] };
    }

    // Build the LLM input
    const memoryDescriptions = memoryList
      .map((m) => `[${m.id}] (${m.type}/${m.subtype ?? 'general'}) ${m.summary}`)
      .join('\n');

    try {
      const inferenceClient = this.inference.getClient({
        request: this.request,
        bindTo: { connectorId: this.connectorId },
      }) as BoundInferenceClient;

      const response = await inferenceClient.chatComplete({
        messages: [
          {
            role: MessageRole.User,
            content: `Here are the memory entries to analyze:\n\n${memoryDescriptions}\n\nExtract relationship triplets between these memories.`,
          },
        ],
        system: TRIPLET_SYSTEM_PROMPT,
      });

      const raw = response.content?.trim();
      if (!raw) {
        return { triplets: [], links: [] };
      }

      return this.parseAndResolve(raw, uniqueMemories);
    } catch (err) {
      this.logger.warn(`TripletExtractor: LLM call failed — ${(err as Error).message}`);
      return { triplets: [], links: [] };
    }
  }

  /**
   * Apply extracted links to the memory graph via MemoryClient.
   */
  async applyLinks(
    result: TripletExtractionResult,
    memoryClient: MemoryClient
  ): Promise<{ added: number; failed: number }> {
    let added = 0;
    let failed = 0;

    for (const { fromId, link } of result.links) {
      try {
        await memoryClient.addLink(fromId, link);
        added++;
      } catch (err) {
        this.logger.warn(
          `TripletExtractor: failed to add link ${fromId} → ${link.target_id}: ${(err as Error).message}`
        );
        failed++;
      }
    }

    this.logger.info(
      `TripletExtractor: applied ${added} links (${failed} failed) from ${result.triplets.length} triplets`
    );

    return { added, failed };
  }

  private async findRelatedMemories(
    newMemories: MemoryNode[],
    memoryClient: MemoryClient
  ): Promise<MemoryNode[]> {
    const related = new Map<string, MemoryNode>();

    // Search for up to 3 existing memories per new memory
    for (const memory of newMemories.slice(0, 5)) {
      try {
        const results = await memoryClient.search(memory.summary, { size: 3 });
        for (const r of results) {
          if (r.id !== memory.id) {
            related.set(r.id, r);
          }
        }
      } catch {
        // non-fatal
      }
    }

    return Array.from(related.values()).slice(0, 10);
  }

  private parseAndResolve(
    raw: string,
    memoryMap: Map<string, MemoryNode>
  ): TripletExtractionResult {
    let parsed: { triplets?: unknown[] };
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { triplets: [], links: [] };
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      this.logger.warn('TripletExtractor: failed to parse JSON response');
      return { triplets: [], links: [] };
    }

    if (!Array.isArray(parsed.triplets)) {
      return { triplets: [], links: [] };
    }

    const validEdgeTypes: MemoryEdgeType[] = [
      'related_to', 'applies_to', 'derived_from', 'contradicts',
      'same_project', 'preference_cluster', 'refines',
    ];

    const triplets: ExtractedTriplet[] = [];
    const links: Array<{ fromId: string; link: MemoryLink }> = [];

    for (const t of parsed.triplets) {
      if (!t || typeof t !== 'object') continue;
      const { subject, relationship, object, confidence } = t as Record<string, unknown>;

      if (typeof subject !== 'string' || typeof object !== 'string') continue;
      if (typeof relationship !== 'string') continue;
      if (subject === object) continue;

      // Verify both IDs exist
      if (!memoryMap.has(subject) || !memoryMap.has(object)) continue;

      const edgeType = validEdgeTypes.includes(relationship as MemoryEdgeType)
        ? (relationship as MemoryEdgeType)
        : 'related_to';

      const conf = typeof confidence === 'number' ? Math.min(1, Math.max(0, confidence)) : 0.5;

      if (conf < 0.4) continue;

      triplets.push({ subject, relationship: edgeType, object, confidence: conf });
      links.push({
        fromId: subject,
        link: { target_id: object, type: edgeType, weight: conf },
      });
    }

    this.logger.info(
      `TripletExtractor: extracted ${triplets.length} valid triplets from LLM response`
    );

    return { triplets, links };
  }
}
