/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { MemoryCreateRequest, MemoryNode, MemoryType } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';
import type { EmbeddingService } from '../embeddings';
import type { ReinforcementSignal } from '../active_memory_set';
import type { ExtractedMemoryCandidate, ExtractionResult } from './memory_extractor';
import { DedupChecker } from './dedup_checker';
import type { ElasticsearchClient } from '@kbn/core/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Context for a single round's extraction pipeline */
export interface CandidatePipelineContext {
  conversationId: string;
  roundId: string;
  space: string;
  userName: string;
  userId?: string;
}

/** Deps needed by the candidate pipeline */
export interface CandidatePipelineDeps {
  memoryClient: MemoryClient;
  esClient: ElasticsearchClient;
  embeddingService: EmbeddingService;
  logger: Logger;
}

/** Summary of what the pipeline created */
export interface PipelineRunResult {
  created: number;
  skipped: number;
  derived: number;
  errors: number;
}

// ---------------------------------------------------------------------------
// CandidatePipeline
// ---------------------------------------------------------------------------

/**
 * Persists extracted memory candidates to the memory index.
 *
 * For each candidate:
 * 1. Run dedup check (embedding similarity against existing memories)
 * 2. Build a MemoryCreateRequest with status='candidate', stability=0.1
 * 3. Optionally add a 'derived_from' link if a related memory was found
 * 4. Bulk-create all non-skipped candidates
 * 5. Process suggested links from semantic extraction
 * 6. Process reinforcement signals from the ActiveMemorySet
 */
export class CandidatePipeline {
  private readonly memoryClient: MemoryClient;
  private readonly embeddingService: EmbeddingService;
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;

  constructor({ memoryClient, esClient, embeddingService, logger }: CandidatePipelineDeps) {
    this.memoryClient = memoryClient;
    this.embeddingService = embeddingService;
    this.logger = logger;
    this.esClient = esClient;
  }

  /**
   * Run the full candidate persistence pipeline for a single round's extraction output.
   *
   * @param extraction - The structured output from MemoryExtractor
   * @param context - Round context (conversation_id, round_id, space, user)
   * @param reinforcementSignals - Advisory signals from ActiveMemorySet.getSignals()
   * @returns Summary counts of what was created/skipped/errored
   */
  async run(
    extraction: ExtractionResult,
    context: CandidatePipelineContext,
    reinforcementSignals: ReinforcementSignal[]
  ): Promise<PipelineRunResult> {
    const result: PipelineRunResult = { created: 0, skipped: 0, derived: 0, errors: 0 };

    const dedupChecker = new DedupChecker({
      esClient: this.esClient,
      embeddingService: this.embeddingService,
      space: context.space,
      userName: context.userName,
      logger: this.logger,
    });

    // Collect all candidate requests after dedup
    const pendingRequests: Array<{
      req: MemoryCreateRequest;
      derivedFromId?: string;
      suggestedLinks?: string[];
    }> = [];

    // Process each memory type
    const typeEntries: Array<[MemoryType, ExtractedMemoryCandidate[]]> = [
      ['semantic', extraction.semantic],
      ['episodic', extraction.episodic],
      ['procedural', extraction.procedural],
    ];

    for (const [type, candidates] of typeEntries) {
      for (const candidate of candidates) {
        try {
          const dedupResult = await dedupChecker.check(candidate.summary);

          if (dedupResult.disposition === 'skip') {
            result.skipped++;
            continue;
          }

          const req: MemoryCreateRequest = {
            type,
            subtype: candidate.subtype,
            summary: candidate.summary,
            full: candidate.full,
            confidence: candidate.confidence,
            stability: 0.1,
            status: 'candidate',
            source_refs: [
              {
                conversation_id: context.conversationId,
                round_id: context.roundId,
              },
            ],
            params: (candidate as any).params,
            space: context.space,
            user_name: context.userName,
            ...(context.userId ? { user_id: context.userId } : {}),
          };

          if (dedupResult.disposition === 'derived') {
            result.derived++;
          }

          pendingRequests.push({
            req,
            derivedFromId: dedupResult.closestMatch?.id,
            suggestedLinks: candidate.suggested_links,
          });
        } catch (err) {
          this.logger.warn(
            `CandidatePipeline: error processing ${type} candidate "${candidate.summary.slice(0, 60)}" — ${(err as Error).message}`
          );
          result.errors++;
        }
      }
    }

    if (pendingRequests.length === 0) {
      this.logger.debug('CandidatePipeline: no candidates to persist after dedup');
      // Still process reinforcement signals even if no new candidates
      await this.processReinforcementSignals(reinforcementSignals);
      return result;
    }

    // Bulk create all candidates
    let createdNodes: MemoryNode[] = [];
    try {
      createdNodes = await this.memoryClient.bulkCreate(pendingRequests.map((p) => p.req));
      result.created = createdNodes.length;
      this.logger.debug(`CandidatePipeline: created ${result.created} candidate memories`);
    } catch (err) {
      this.logger.warn(`CandidatePipeline: bulkCreate failed — ${(err as Error).message}`);
      result.errors += pendingRequests.length;
      await this.processReinforcementSignals(reinforcementSignals);
      return result;
    }

    // Process links for created nodes
    // Match by index — bulkCreate returns results in the same order
    for (let i = 0; i < Math.min(createdNodes.length, pendingRequests.length); i++) {
      const node = createdNodes[i];
      const pending = pendingRequests[i];

      if (!node) {
        continue;
      }

      // Add derived_from link if this candidate is related to an existing memory
      if (pending.derivedFromId) {
        try {
          await this.memoryClient.addLink(node.id, {
            target_id: pending.derivedFromId,
            type: 'derived_from',
            weight: 0.7,
          });
        } catch (err) {
          this.logger.debug(
            `CandidatePipeline: could not add derived_from link from ${node.id} to ${pending.derivedFromId} — ${(err as Error).message}`
          );
        }
      }

      // Add suggested links from semantic extraction
      if (pending.suggestedLinks && pending.suggestedLinks.length > 0) {
        for (const targetId of pending.suggestedLinks.slice(0, 5)) {
          try {
            await this.memoryClient.addLink(node.id, {
              target_id: targetId,
              type: 'related_to',
              weight: 0.5,
            });
          } catch (err) {
            // Non-fatal — target may not exist
            this.logger.debug(
              `CandidatePipeline: could not add suggested link from ${node.id} to ${targetId} — ${(err as Error).message}`
            );
          }
        }
      }
    }

    // Process reinforcement signals
    await this.processReinforcementSignals(reinforcementSignals);

    return result;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Delegate reinforcement signals to the signal processor.
   * Each signal's effect is applied to the target memory via memoryClient.update().
   * Imported lazily to avoid circular dependency.
   */
  private async processReinforcementSignals(signals: ReinforcementSignal[]): Promise<void> {
    if (signals.length === 0) {
      return;
    }

    try {
      // Import the signal processor lazily
      const { SignalProcessor } = await import('../reinforcement/signal_processor');
      const processor = new SignalProcessor({
        memoryClient: this.memoryClient,
        logger: this.logger,
      });

      await processor.process(signals);
    } catch (err) {
      this.logger.warn(
        `CandidatePipeline: reinforcement signal processing failed — ${(err as Error).message}`
      );
    }
  }
}
