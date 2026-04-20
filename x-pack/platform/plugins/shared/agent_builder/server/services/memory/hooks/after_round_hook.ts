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
import { consumeRunSignals } from '../create_memory_tools';
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
        timestamp: context.round.started_at,
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
  runId: string;
}) => Promise<void>) => {
  const logger = deps.logger.get('memory.afterRound');

  // Track idle timers per conversation for idle-based extraction.
  // When the timer fires, load the full conversation and extract from all of it.
  const idleTimers = new Map<string, { timer: NodeJS.Timeout; request: KibanaRequest }>();

  return async ({ request, round, conversationId, conversation, runId }) => {
    const roundId = round.id;
    const reinforcementSignals = consumeRunSignals(runId);

    // Schedule idle-based extraction if enabled
    if (deps.config.memory.extraction.onIdle.enabled) {
      const existing = idleTimers.get(conversationId);
      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(async () => {
        idleTimers.delete(conversationId);

        logger.info(
          `onIdle: conversation ${conversationId} idle for ${deps.config.memory.extraction.onIdle.idleTimeoutMs}ms, ` +
          `loading full conversation for extraction`
        );

        try {
          const services = deps.getInternalServices();
          const convClient = await services.conversations.getScopedClient({ request });
          const fullConversation = await convClient.get(conversationId);

          if (!fullConversation || fullConversation.rounds.length === 0) {
            logger.info(`onIdle: conversation ${conversationId} not found or empty, skipping`);
            return;
          }

          const lastRound = fullConversation.rounds[fullConversation.rounds.length - 1];
          const connectorId = deps.config.memory.extraction.connectorId;
          const space = getCurrentSpaceId({ request, spaces: services.spaces });
          const memoryClient = await services.memory.getScopedClient({ request });

          await runAfterRoundExtractionPipeline(
            {
              request,
              conversationId,
              roundId: lastRound.id,
              round: lastRound,
              conversation: fullConversation,
              reinforcementSignals: [],
              memoryClient,
              connectorId: connectorId ?? '',
              space,
            },
            { ...deps, inference: services.inference }
          );

          logger.info(`onIdle: extraction complete for conversation ${conversationId} (${fullConversation.rounds.length} rounds)`);
        } catch (err) {
          logger.warn(`onIdle: extraction failed for conversation ${conversationId} — ${(err as Error).message}`);
        }
      }, deps.config.memory.extraction.onIdle.idleTimeoutMs);

      idleTimers.set(conversationId, { timer, request });
    }

    // Skip after-round extraction if disabled
    if (!deps.config.memory.extraction.afterRound) {
      logger.info(`afterRound: after-round extraction disabled via config, skipping`);
      return;
    }

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

    const llmMethods = ['llm', 'cognitive'];
    let connectorId: string | undefined;
    if (llmMethods.includes(deps.config.memory.extraction.method)) {
      connectorId = deps.config.memory.extraction.connectorId;

      if (!connectorId) {
        logger.info(`afterRound: no connectorId configured for ${deps.config.memory.extraction.method} extraction — skipping`);
        return;
      }

      logger.info(`afterRound: using connector=${connectorId} for ${deps.config.memory.extraction.method} extraction`);
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
      reinforcementSignals,
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
