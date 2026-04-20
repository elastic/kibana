/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ExtractionInput } from './memory_extractor';
import type { ExtractionResult, ExtractedMemoryCandidate } from './memory_extractor';

/**
 * A simple extractor that stores each round as a single episodic memory
 * representing the full turn (user query + agent response).
 *
 * The conversation ID is stored in source_refs so all turns in a conversation
 * are linked back to it. The full turn text is stored for embedding-based
 * retrieval later.
 *
 * This is the lightest possible extractor — no LLM, no chunking logic.
 * One memory per round, always.
 */
export class TurnExtractor {
  private readonly logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const message = input.message?.trim() ?? '';

    if (!message) {
      return { semantic: [], episodic: [], procedural: [] };
    }

    const full = message;
    const summary = message.length > 80 ? message.slice(0, 77) + '...' : message;

    const candidate: ExtractedMemoryCandidate = {
      summary,
      full,
      subtype: 'turn',
      confidence: 0.6,
    };

    this.logger.debug(
      `TurnExtractor: created turn memory (${full.length} chars)`
    );

    return {
      semantic: [],
      episodic: [candidate],
      procedural: [],
    };
  }
}
