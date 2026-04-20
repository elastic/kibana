/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ExtractionInput } from './memory_extractor';
import type { ExtractionResult, ExtractedMemoryCandidate } from './memory_extractor';
import { segmentWithTextTiling } from './segmentation/text_tiling';
import { segmentWithEmbeddingSimilarity } from './segmentation/embedding_similarity';
import type { EmbedFn } from './segmentation/embedding_similarity';

/**
 * Configuration for the chunking extractor.
 */
export interface ChunkingExtractorConfig {
  method?: string;
  maxChunkChars: number;
  overlapChars: number;
  texttiling?: {
    windowSize: number;
    smoothingWidth: number;
    threshold: number;
  };
  embeddingSimilarity?: {
    sentenceWindowSize: number;
    similarityThreshold: number;
  };
}

const DEFAULT_CONFIG: ChunkingExtractorConfig = {
  method: 'fixed',
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
  private readonly embedFn?: EmbedFn;

  constructor({ config, logger, embedFn }: {
    config?: Partial<ChunkingExtractorConfig>;
    logger: Logger;
    embedFn?: EmbedFn;
  }) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger;
    this.embedFn = embedFn;
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const text = this.buildText(input);

    if (!text.trim()) {
      return { semantic: [], episodic: [], procedural: [] };
    }

    const method = this.config.method ?? 'fixed';
    let chunks: string[];

    switch (method) {
      case 'texttiling':
        chunks = segmentWithTextTiling(text, this.config.texttiling);
        break;
      case 'embedding_similarity':
        chunks = await segmentWithEmbeddingSimilarity(text, this.config.embeddingSimilarity, this.embedFn);
        break;
      case 'hybrid':
        return this.extractHybrid(input);
      case 'fixed':
      default:
        chunks = this.chunkText(text);
        break;
    }

    const candidates: ExtractedMemoryCandidate[] = chunks.map((chunk) => ({
      summary: chunk.length > 100 ? chunk.slice(0, 97) + '...' : chunk,
      full: chunk,
      subtype: `chunked_${method}`,
      confidence: 0.5,
    }));

    this.logger.debug(
      `ChunkingExtractor: produced ${candidates.length} chunks from ${text.length} chars using method=${method}`
    );

    return {
      semantic: [],
      episodic: candidates,
      procedural: [],
    };
  }

  /**
   * Hybrid extraction: produces both per-turn episodic memories AND
   * larger semantic memories from groups of related turns.
   *
   * 1. Create one episodic memory for the current turn (user + assistant)
   * 2. If the full conversation is available, build a text of all turns
   *    and use embedding-similarity segmentation to find topic clusters
   * 3. Each cluster becomes a semantic memory (multi-turn context)
   */
  private async extractHybrid(input: ExtractionInput): Promise<ExtractionResult> {
    const episodic: ExtractedMemoryCandidate[] = [];
    const semantic: ExtractedMemoryCandidate[] = [];

    // Step 1: Current turn → episodic memory
    const turnText = input.message?.trim() ?? '';
    if (turnText.length > 10) {
      episodic.push({
        summary: turnText.length > 80 ? turnText.slice(0, 77) + '...' : turnText,
        full: turnText,
        subtype: 'turn',
        confidence: 0.6,
      });
    }

    // Step 2: If conversation history is available, segment all turns into topic groups
    if (input.conversation?.rounds && input.conversation.rounds.length > 1) {
      const allTurns = input.conversation.rounds.map((round) => {
        const userMsg = round.input.message ?? '';
        const assistantMsg = round.response.message ?? '';
        return `User: ${userMsg}\nAssistant: ${assistantMsg}`;
      });

      // Use each turn as a "sentence" for the similarity segmenter
      const fullText = allTurns.join('\n\n---\n\n');
      const segments = await segmentWithEmbeddingSimilarity(
        fullText,
        {
          ...this.config.embeddingSimilarity,
          sentenceWindowSize: 1,
        },
        this.embedFn
      );

      // Each segment that spans multiple turns becomes a semantic memory
      for (const segment of segments) {
        const turnCount = (segment.match(/---/g) || []).length + 1;
        if (turnCount > 1) {
          const firstLine = segment.split('\n')[0] ?? '';
          semantic.push({
            summary: firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine,
            full: segment,
            subtype: 'multi_turn_cluster',
            confidence: 0.5,
          });
        }
      }
    }

    this.logger.debug(
      `ChunkingExtractor hybrid: ${episodic.length} episodic + ${semantic.length} semantic (multi-turn clusters)`
    );

    return { semantic, episodic, procedural: [] };
  }

  private buildText(input: ExtractionInput): string {
    return input.message?.trim() ?? '';
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
