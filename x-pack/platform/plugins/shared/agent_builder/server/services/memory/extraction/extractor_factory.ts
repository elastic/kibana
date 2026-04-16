/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { AgentBuilderConfig } from '../../../config';
import type { ExtractionInput, ExtractionResult } from './memory_extractor';
import { MemoryExtractor } from './memory_extractor';
import { ChunkingExtractor } from './chunking_extractor';
import { TurnExtractor } from './turn_extractor';

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
}

/**
 * Create the appropriate extraction strategy based on config.
 *
 * - 'llm': Uses MemoryExtractor (requires inference + connector + request)
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
    case 'chunking': {
      return new ChunkingExtractor({
        config: opts.config.memory.extraction.chunking,
        logger: opts.logger,
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
