/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { Conversation, ConversationRound } from '@kbn/agent-builder-common';
import type { AgentBuilderConfig } from '../../../config';
import type { InternalStartServices } from '../../types';
import { buildExtractionInputFromRound } from '../extraction/memory_extractor';
import { createExtractionStrategy } from '../extraction/extractor_factory';
import { CandidatePipeline } from '../extraction/candidate_pipeline';
import type { ReinforcementSignal } from '../active_memory_set';
import { getCurrentSpaceId } from '../../../utils/spaces';
import { createEmbeddingService } from '../embeddings';
import type { MemoryClient } from '../client';

/**
 * Context required to run the after-round memory extraction pipeline.
 */
export interface AfterRoundExtractionContext {
  request: KibanaRequest;
  conversationId: string;
  roundId: string;
  round: ConversationRound;
  conversation?: Conversation;
  reinforcementSignals: ReinforcementSignal[];
  memoryClient: MemoryClient;
  connectorId: string;
  space: string;
}

/**
 * Deps needed to register the after-round memory extraction hook.
 */
export interface RegisterMemoryAfterRoundHookDeps {
  logger: Logger;
  config: AgentBuilderConfig;
  getInternalServices: () => InternalStartServices;
}

/**
 * Run the full post-round memory extraction pipeline.
 *
 * This function is designed to be called fire-and-forget. It never throws.
 * All errors are caught and logged.
 *
 * Pipeline steps:
 * 1. Extract memory candidates via LLM
 * 2. Run dedup check + persist non-duplicate candidates
 * 3. Apply reinforcement signals from the active memory set
 *
 * @param context - Round context including round data and signals
 * @param deps - Services needed for extraction
 */
export const runAfterRoundExtractionPipeline = async (
  context: AfterRoundExtractionContext,
  deps: RegisterMemoryAfterRoundHookDeps & { inference: InferenceServerStart }
): Promise<void> => {
  const { logger } = deps;
  const inference = deps.inference;
  const log = logger.get('afterRound');

  log.debug(
    `afterRound: starting extraction for conversation=${context.conversationId}, round=${context.roundId}`
  );

  // Step 1: Extract candidates using configured strategy (LLM or chunking)
  const extractor = createExtractionStrategy({
    config: deps.config,
    logger: log.get('extractor'),
    inference,
    connectorId: context.connectorId,
    request: context.request,
  });

  const extractionInput = buildExtractionInputFromRound(context.round, context.conversation);
  const extraction = await extractor.extract(extractionInput);

  const totalCandidates =
    extraction.semantic.length + extraction.episodic.length + extraction.procedural.length;

  if (totalCandidates === 0 && context.reinforcementSignals.length === 0) {
    log.info(`afterRound: no memory candidates extracted for round=${context.roundId}`);
    return;
  }

  log.info(
    `afterRound: extracted ${totalCandidates} memory candidates ` +
      `(semantic=${extraction.semantic.length}, episodic=${extraction.episodic.length}, procedural=${extraction.procedural.length}) ` +
      `for round=${context.roundId}`
  );

  if (totalCandidates < 10) {
    const allCandidates = [
      ...extraction.semantic.map((c) => `  [semantic] ${c.summary} (confidence: ${c.confidence.toFixed(2)})`),
      ...extraction.episodic.map((c) => `  [episodic] ${c.summary} (confidence: ${c.confidence.toFixed(2)})`),
      ...extraction.procedural.map((c) => `  [procedural] ${c.summary} (confidence: ${c.confidence.toFixed(2)})`),
    ];
    log.info(`afterRound: extracted memories:\n${allCandidates.join('\n')}`);
  }

  // Step 2+3: Dedup, persist, and process reinforcement signals.
  // Use a noop embedding service (BM25-only mode) since we don't have the
  // embedding endpoint config wired here. Dedup falls back to 'fresh' disposition.
  // TODO: Wire up embedding endpoint from plugin config for true vector dedup.
  const noopEmbeddingService = createEmbeddingService({
    esClient: {} as any, // never used when inferenceEndpointId is undefined
    config: { inferenceEndpointId: undefined },
    logger: log.get('embedding'),
  });

  const pipeline = new CandidatePipeline({
    memoryClient: context.memoryClient,
    esClient: {} as any, // not used in BM25-only dedup mode
    embeddingService: noopEmbeddingService,
    logger: log.get('pipeline'),
  });

  try {
    const pipelineResult = await pipeline.run(
      extraction,
      {
        conversationId: context.conversationId,
        roundId: context.roundId,
        space: context.space,
        userName: 'user', // actual user is embedded in the scoped memory client
      },
      context.reinforcementSignals
    );

    log.debug(
      `afterRound: pipeline complete — created=${pipelineResult.created}, skipped=${pipelineResult.skipped}, derived=${pipelineResult.derived}, errors=${pipelineResult.errors}`
    );

  } catch (err) {
    log.warn(`afterRound: pipeline failed — ${(err as Error).message}`);
  }
};

/**
 * Create a callback that runs post-round memory extraction.
 *
 * Called directly from run_chat_agent.ts after every completed round,
 * regardless of which tools were called. This ensures memory extraction
 * happens even when the agent doesn't call checkpoint.
 *
 * The callback is fire-and-forget — it never blocks the response.
 */
export const createMemoryExtractionCallback = (
  deps: RegisterMemoryAfterRoundHookDeps
): ((params: {
  request: KibanaRequest;
  round: ConversationRound;
  conversationId: string;
  conversation?: Conversation;
}) => Promise<void>) => {
  const logger = deps.logger.get('memory.afterRound');

  return async ({ request, round, conversationId, conversation }) => {
    const roundId = round.id;
    logger.info(
      `afterRound: starting extraction pipeline, method=${deps.config.memory.extraction.method}, round=${roundId}`
    );

    // Resolve the connector for LLM-based extraction.
    // For chunking mode, connectorId is not required — the factory will handle it.
    let services: InternalStartServices;
    try {
      services = deps.getInternalServices();
    } catch (err) {
      logger.info(`afterRound: services not available — ${(err as Error).message}`);
      return;
    }

    let connectorId: string | undefined;
    if (deps.config.memory.extraction.method === 'llm') {
      // Prefer explicit config connector ID
      connectorId = deps.config.memory.extraction.connectorId;

      if (!connectorId) {
        logger.info('afterRound: no connectorId configured for LLM extraction — skipping');
        return;
      }

      logger.info(`afterRound: using connector=${connectorId} for LLM extraction`);
    }

    const space = getCurrentSpaceId({ request, spaces: services.spaces });

    let memoryClient: MemoryClient;
    try {
      memoryClient = await services.memory.getScopedClient({ request });
    } catch (err) {
      logger.info(`afterRound: could not create memory client — ${(err as Error).message}`);
      return;
    }

    const extractionContext: AfterRoundExtractionContext = {
      request,
      conversationId,
      roundId,
      round,
      conversation,
      reinforcementSignals: [],
      memoryClient,
      connectorId: connectorId ?? '',
      space,
    };

    logger.info(
      `afterRound: inference available=${!!services.inference}, hasGetClient=${typeof services.inference?.getClient}`
    );

    await runAfterRoundExtractionPipeline(extractionContext, {
      ...deps,
      inference: services.inference,
    });
  };
};
