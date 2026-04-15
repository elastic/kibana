/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type { AfterToolCallHookContext } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { InternalSetupServices, InternalStartServices } from '../../types';
import { MEMORY_CHECKPOINT_TOOL_ID } from '../tools';
import { MemoryExtractor, buildExtractionInputFromRound } from '../extraction/memory_extractor';
import { CandidatePipeline } from '../extraction/candidate_pipeline';
import type { ReinforcementSignal } from '../active_memory_set';
import { getCurrentSpaceId } from '../../../utils/spaces';
import { createEmbeddingService } from '../embeddings';
import { resolveSelectedConnectorId } from '../../../utils/resolve_selected_connector_id';
import type { MemoryClient } from '../client';

/**
 * Context required to run the after-round memory extraction pipeline.
 */
export interface AfterRoundExtractionContext {
  request: KibanaRequest;
  conversationId: string;
  roundId: string;
  round: ConversationRound;
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
  inference: InferenceServerStart;
  /**
   * Lazy getter for core start services (uiSettings, savedObjects).
   * The return type is left broad to avoid coupling to a specific CoreSetup generic.
   */
  getStartServices: () => Promise<[{ uiSettings: UiSettingsServiceStart; savedObjects: SavedObjectsServiceStart }, ...unknown[]]>;
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
  deps: RegisterMemoryAfterRoundHookDeps
): Promise<void> => {
  const { logger, inference } = deps;
  const log = logger.get('afterRound');

  log.debug(
    `afterRound: starting extraction for conversation=${context.conversationId}, round=${context.roundId}`
  );

  // Step 1: Extract candidates using LLM
  const extractor = new MemoryExtractor({
    inference,
    connectorId: context.connectorId,
    request: context.request,
    logger: log.get('extractor'),
  });

  const extractionInput = buildExtractionInputFromRound(context.round);
  const extraction = await extractor.extract(extractionInput);

  const totalCandidates =
    extraction.semantic.length + extraction.episodic.length + extraction.procedural.length;

  if (totalCandidates === 0 && context.reinforcementSignals.length === 0) {
    log.debug(`afterRound: nothing to process for round=${context.roundId}`);
    return;
  }

  log.debug(
    `afterRound: extracted ${totalCandidates} candidates (semantic=${extraction.semantic.length}, episodic=${extraction.episodic.length}, procedural=${extraction.procedural.length})`
  );

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
 * Register the memory after-round hook with the hooks service.
 *
 * This hook fires non-blocking when the agent calls checkpoint(final=true),
 * which signals the end of the round. It triggers the async memory extraction
 * pipeline without blocking response delivery.
 *
 * Integration point: afterToolCall hook (nonBlocking) listening for
 * memory.checkpoint with final=true.
 *
 * The tool handler context may expose (if set by the memory tools):
 * - conversation_id / round_id: round provenance
 * - round: the full ConversationRound (for extraction input)
 * - active_memory_set: the ActiveMemorySet for reinforcement signals
 */
export const registerMemoryAfterRoundHook = (
  serviceSetups: InternalSetupServices,
  deps: RegisterMemoryAfterRoundHookDeps
): void => {
  const logger = deps.logger.get('memory.afterRound');

  serviceSetups.hooks.register({
    id: 'memory-after-round-extraction',
    hooks: {
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: async (context: AfterToolCallHookContext) => {
          // Only trigger on memory.checkpoint with final=true
          if (context.toolId !== MEMORY_CHECKPOINT_TOOL_ID) {
            return;
          }

          const params = context.toolParams as { final?: boolean };
          if (!params.final) {
            return;
          }

          // Extract round data from the tool handler context
          const handlerContext = (context.toolHandlerContext as unknown) as
            | Record<string, unknown>
            | undefined;

          if (!handlerContext) {
            logger.debug('afterRound: no tool handler context available — skipping extraction');
            return;
          }

          // Get the active memory set signals from the handler context
          const activeMemorySet = handlerContext.active_memory_set as
            | { getSignals: () => ReinforcementSignal[] }
            | undefined;
          const reinforcementSignals: ReinforcementSignal[] = activeMemorySet?.getSignals() ?? [];

          // Get conversation/round context from handler context
          const conversationId =
            (handlerContext.conversation_id as string | undefined) ??
            (handlerContext.conversationId as string | undefined);
          const roundId =
            (handlerContext.round_id as string | undefined) ??
            (handlerContext.roundId as string | undefined);
          const round = handlerContext.round as ConversationRound | undefined;

          if (!conversationId || !roundId || !round) {
            logger.debug(
              `afterRound: missing round context — skipping extraction ` +
                `(conversationId=${conversationId ?? 'missing'}, roundId=${roundId ?? 'missing'}, round=${!!round})`
            );
            return;
          }

          // Resolve the connector for extraction LLM calls
          // Use lazy getStartServices to get uiSettings + savedObjects
          let connectorId: string | undefined;
          try {
            const [coreStart] = await deps.getStartServices();
            connectorId = await resolveSelectedConnectorId({
              request: context.request,
              inference: deps.inference,
              uiSettings: coreStart.uiSettings,
              savedObjects: coreStart.savedObjects,
            });
          } catch (err) {
            logger.debug(`afterRound: could not resolve connector — ${(err as Error).message}`);
          }

          if (!connectorId) {
            logger.debug('afterRound: no connector available — skipping extraction');
            return;
          }

          // Get services for memory client and space resolution
          let services: InternalStartServices;
          try {
            services = deps.getInternalServices();
          } catch (err) {
            logger.warn(`afterRound: services not available — ${(err as Error).message}`);
            return;
          }

          const space = getCurrentSpaceId({ request: context.request, spaces: services.spaces });

          // Get a scoped memory client — handles user+space isolation
          let memoryClient: MemoryClient;
          try {
            memoryClient = await services.memory.getScopedClient({ request: context.request });
          } catch (err) {
            logger.warn(`afterRound: could not create memory client — ${(err as Error).message}`);
            return;
          }

          const extractionContext: AfterRoundExtractionContext = {
            request: context.request,
            conversationId,
            roundId,
            round,
            reinforcementSignals,
            memoryClient,
            connectorId,
            space,
          };

          // Non-blocking: fire-and-forget the extraction pipeline
          runAfterRoundExtractionPipeline(extractionContext, deps).catch((err) => {
            logger.warn(`afterRound: extraction pipeline error — ${(err as Error).message}`);
          });
        },
      },
    },
  });

  logger.debug('Memory after-round extraction hook registered');
};
