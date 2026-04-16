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
 * Configuration for the chunking extractor.
 */
export interface ChunkingExtractorConfig {
  maxChunkChars: number;
  overlapChars: number;
}

const DEFAULT_CONFIG: ChunkingExtractorConfig = {
  maxChunkChars: 300,
  overlapChars: 30,
};

/**
 * A simple, no-LLM memory extractor that breaks round content into text chunks.
 *
 * Strategy:
 * 1. Build a single text block from user message + assistant response + tool results
 * 2. Split into chunks, preferring paragraph boundaries, then sentence boundaries,
 *    then fixed character length
 * 3. Each chunk becomes a semantic memory candidate with moderate confidence
 *
 * This is a cheap fallback when LLM-based extraction is not desired.
 */
export class ChunkingExtractor {
  private readonly config: ChunkingExtractorConfig;
  private readonly logger: Logger;

  constructor({ config, logger }: { config?: Partial<ChunkingExtractorConfig>; logger: Logger }) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger;
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const text = this.buildText(input);

    if (!text.trim()) {
      return { semantic: [], episodic: [], procedural: [] };
    }

    const chunks = this.chunkText(text);

    const candidates: ExtractedMemoryCandidate[] = chunks.map((chunk) => ({
      summary: chunk.length > 100 ? chunk.slice(0, 97) + '...' : chunk,
      full: chunk,
      subtype: 'chunked_extract',
      confidence: 0.5,
    }));

    this.logger.debug(
      `ChunkingExtractor: produced ${candidates.length} chunks from ${text.length} chars`
    );

    return {
      semantic: candidates,
      episodic: [],
      procedural: [],
    };
  }

  private buildText(input: ExtractionInput): string {
    const parts: string[] = [];

    if (input.userMessage?.trim()) {
      parts.push(input.userMessage.trim());
    }
    if (input.reasoningSteps && input.reasoningSteps.length > 0) {
      parts.push(input.reasoningSteps.join('\n'));
    }
    if (input.toolCalls) {
      for (const tc of input.toolCalls) {
        const resultText = tc.results
          .map((r) => (typeof r.data === 'string' ? r.data : JSON.stringify(r.data)))
          .join(' ')
          .slice(0, this.config.maxChunkChars * 2);
        parts.push(`[${tc.tool_id}]: ${resultText || '(no result)'}`);
      }
    }
    if (input.assistantResponse?.trim()) {
      parts.push(input.assistantResponse.trim());
    }

    return parts.join('\n\n');
  }

  /**
   * Split text into chunks, trying to break at natural boundaries.
   *
   * Priority: paragraph breaks (\n\n) > sentence ends (.!?) > fixed length.
   */
  private chunkText(text: string): string[] {
    const { maxChunkChars, overlapChars } = this.config;
    const paragraphs = text.split(/\n{2,}/);
    const rawChunks: string[] = [];

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        continue;
      }

      if (trimmed.length <= maxChunkChars) {
        rawChunks.push(trimmed);
      } else {
        const subChunks = this.splitLongBlock(trimmed, maxChunkChars);
        rawChunks.push(...subChunks);
      }
    }

    if (overlapChars <= 0 || rawChunks.length <= 1) {
      return rawChunks.filter((c) => c.length > 0);
    }

    // Apply overlap: prepend tail of previous chunk to current
    const result: string[] = [rawChunks[0]];
    for (let i = 1; i < rawChunks.length; i++) {
      const prevTail = rawChunks[i - 1].slice(-overlapChars);
      result.push(prevTail + rawChunks[i]);
    }

    return result.filter((c) => c.length > 0);
  }

  /**
   * Split a block that exceeds maxChunkChars.
   * Try to break on sentence boundaries first, fall back to fixed length.
   */
  private splitLongBlock(block: string, maxLen: number): string[] {
    const sentences = block.match(/[^.!?]+[.!?]+\s*/g);

    if (sentences && sentences.length > 1) {
      return this.mergeToChunks(sentences, maxLen);
    }

    // No sentence boundaries found — split at fixed length
    const chunks: string[] = [];
    for (let i = 0; i < block.length; i += maxLen) {
      chunks.push(block.slice(i, i + maxLen).trim());
    }
    return chunks.filter((c) => c.length > 0);
  }

  /**
   * Merge small segments (sentences) into chunks up to maxLen.
   */
  private mergeToChunks(segments: string[], maxLen: number): string[] {
    const chunks: string[] = [];
    let current = '';

    for (const segment of segments) {
      if (current.length + segment.length > maxLen && current.length > 0) {
        chunks.push(current.trim());
        current = '';
      }
      current += segment;
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks;
  }
}
