/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AgentBuilderConfig } from '../../../config';
import type { ExtractionInput, ExtractionResult } from './memory_extractor';
import { MemoryExtractor } from './memory_extractor';
import { CognitiveExtractor } from './cognitive_extractor';
import { ChunkingExtractor } from './chunking_extractor';
import { TurnExtractor } from './turn_extractor';
import type { EmbedFn } from './segmentation/embedding_similarity';

/**
 * Common interface for all memory extraction methods.
 */
export interface MemoryExtractionStrategy {
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}

/**
 * Options for creating an extraction strategy.
 * Not all fields are needed by all methods — LLM needs inference/connector/request,
 * chunking only needs config.
 */
export interface ExtractionStrategyOptions {
  config: AgentBuilderConfig;
  logger: Logger;
  inference?: InferenceServerStart;
  connectorId?: string;
  request?: KibanaRequest;
  esClient?: ElasticsearchClient;
}

/**
 * Create the appropriate extraction strategy based on config.
 *
 * - 'llm': Uses MemoryExtractor — flat text memories (requires inference + connector + request)
 * - 'cognitive': Uses CognitiveExtractor — structured memories with domain-specific params (requires inference + connector + request)
 * - 'chunking': Uses ChunkingExtractor (no external dependencies)
 * - 'turn': Uses TurnExtractor (one episodic memory per round, no external dependencies)
 */
export const createExtractionStrategy = (
  opts: ExtractionStrategyOptions
): MemoryExtractionStrategy => {
  const method = opts.config.memory.extraction.method;

  switch (method) {
    case 'llm': {
      if (!opts.inference || !opts.connectorId || !opts.request) {
        opts.logger.warn(
          `Memory extraction method is "llm" but missing: inference=${!!opts.inference}, connectorId=${!!opts.connectorId}, request=${!!opts.request}. Falling back to "chunking".`
        );
        return new ChunkingExtractor({
          config: opts.config.memory.extraction.chunking,
          logger: opts.logger,
        });
      }
      return new MemoryExtractor({
        inference: opts.inference,
        connectorId: opts.connectorId,
        request: opts.request,
        logger: opts.logger,
      });
    }
    case 'cognitive': {
      if (!opts.inference || !opts.connectorId || !opts.request) {
        opts.logger.warn(
          `Memory extraction method is "cognitive" but missing: inference=${!!opts.inference}, connectorId=${!!opts.connectorId}, request=${!!opts.request}. Falling back to "chunking".`
        );
        return new ChunkingExtractor({
          config: opts.config.memory.extraction.chunking,
          logger: opts.logger,
        });
      }
      return new CognitiveExtractor({
        inference: opts.inference,
        connectorId: opts.connectorId,
        request: opts.request,
        logger: opts.logger,
      });
    }
    case 'chunking': {
      let embedFn: EmbedFn | undefined;
      const chunkingConfig = opts.config.memory.extraction.chunking;

      if (
        chunkingConfig.embeddingSimilarity?.similarity === 'inference' &&
        opts.esClient &&
        opts.config.memory.retrieval.inferenceEndpointId
      ) {
        const esClient = opts.esClient;
        const endpointId = opts.config.memory.retrieval.inferenceEndpointId;
        embedFn = async (text: string): Promise<number[]> => {
          try {
            const response = await esClient.inference.inference({
              inference_id: endpointId,
              input: text,
            });
            const resp = response as any;
            const embedding = resp.text_embedding?.[0]?.embedding ?? resp.sparse_embedding?.[0]?.embedding;
            return Array.isArray(embedding) ? embedding : [];
          } catch (err) {
            opts.logger.warn(`embedFn: inference call failed: ${(err as Error).message}`);
            return [];
          }
        };
      }

      return new ChunkingExtractor({
        config: chunkingConfig,
        logger: opts.logger,
        embedFn,
      });
    }
    case 'turn': {
      return new TurnExtractor({ logger: opts.logger });
    }
    default: {
      opts.logger.warn(`Unknown memory extraction method "${method}", falling back to "chunking"`);
      return new ChunkingExtractor({
        config: opts.config.memory.extraction.chunking,
        logger: opts.logger,
      });
    }
  }
};
