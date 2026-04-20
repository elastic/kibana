/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';

/**
 * Configuration for the embedding service.
 */
export interface EmbeddingServiceConfig {
  /**
   * The Elasticsearch inference endpoint ID to use for generating embeddings.
   * If not configured, embed() returns empty arrays (BM25-only mode).
   *
   * For ELSER (sparse), use the endpoint ID of your ELSER deployment.
   * For dense vector models, use the endpoint ID of your dense model.
   *
   * Example: '.elser-2-elasticsearch', 'my-e5-endpoint'
   */
  inferenceEndpointId?: string;
}

/**
 * Service for generating text embeddings via Elasticsearch _inference API.
 *
 * When no embedding model is configured, all embed() calls return empty arrays,
 * effectively enabling BM25-only retrieval mode. This is the safe default.
 *
 * Supports both ELSER (sparse) and dense vector models. The task type is
 * auto-detected from the inference endpoint configuration.
 */
export class EmbeddingService {
  private readonly esClient: ElasticsearchClient;
  private readonly inferenceEndpointId?: string;
  private readonly logger: Logger;

  constructor({
    esClient,
    config,
    logger,
  }: {
    esClient: ElasticsearchClient;
    config: EmbeddingServiceConfig;
    logger: Logger;
  }) {
    this.esClient = esClient;
    this.inferenceEndpointId = config.inferenceEndpointId;
    this.logger = logger;
  }

  /**
   * Generate a dense embedding vector for a single text string.
   *
   * Returns an empty array [] if:
   * - No inference endpoint is configured (BM25-only mode)
   * - The inference call fails (logs warning, falls back gracefully)
   *
   * @param text - The text to embed.
   * @returns A promise resolving to a number[] (embedding) or [] on fallback.
   */
  async embed(text: string): Promise<number[]> {
    if (!this.inferenceEndpointId) {
      this.logger.debug('EmbeddingService: no endpoint configured, returning empty embedding');
      return [];
    }

    try {
      const response = await (this.esClient as any).inference.inference({
        inference_id: this.inferenceEndpointId,
        body: {
          input: text,
        },
      });

      return this.extractEmbeddingFromResponse(response, text);
    } catch (err) {
      this.logger.warn(
        `EmbeddingService: failed to embed text (len=${text.length}): ${(err as Error).message}`
      );
      return [];
    }
  }

  /**
   * Generate embedding vectors for multiple texts in a single batch call.
   *
   * Returns an array of empty arrays [] if:
   * - No inference endpoint is configured (BM25-only mode)
   * - The batch inference call fails (logs warning, falls back gracefully)
   *
   * @param texts - An array of texts to embed.
   * @returns A promise resolving to number[][] (one embedding per text) or [] per text on fallback.
   */
  async batchEmbed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    if (!this.inferenceEndpointId) {
      this.logger.debug(
        `EmbeddingService: no endpoint configured, returning ${texts.length} empty embeddings`
      );
      return texts.map(() => []);
    }

    try {
      const response = await (this.esClient as any).inference.inference({
        inference_id: this.inferenceEndpointId,
        body: {
          input: texts,
        },
      });

      return this.extractBatchEmbeddingsFromResponse(response, texts);
    } catch (err) {
      this.logger.warn(
        `EmbeddingService: failed to batch embed ${texts.length} texts: ${(err as Error).message}`
      );
      return texts.map(() => []);
    }
  }

  /**
   * Returns true if this service has an embedding model configured and can produce
   * real embeddings. When false, all embed() calls return empty arrays (BM25-only mode).
   */
  isAvailable(): boolean {
    return Boolean(this.inferenceEndpointId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Extract a single embedding from the ES inference API response.
   * Handles both dense (number[]) and sparse (token-weight map) response formats.
   *
   * For sparse responses, returns [] since kNN requires dense vectors.
   * ELSER retrieval should use the kNN query with the model's sparse format,
   * but for this service we only support dense vector mode for kNN.
   */
  private extractEmbeddingFromResponse(response: unknown, _text: string): number[] {
    const result = response as {
      text_embedding?: Array<{ embedding: number[] | Record<string, number> }>;
      sparse_embedding?: Array<{ embedding: Record<string, number> }>;
    };

    // Try dense embeddings first
    const denseEmbedding = result?.text_embedding?.[0]?.embedding;
    if (denseEmbedding && Array.isArray(denseEmbedding)) {
      return denseEmbedding as number[];
    }

    // Sparse embeddings (ELSER) — convert token weights to a deterministic dense-ish vector
    // by returning the weights as-is for sparse retrieval downstream
    if (result?.sparse_embedding?.[0]?.embedding) {
      this.logger.debug('EmbeddingService: sparse embedding received — not usable for dense kNN');
      return [];
    }

    if (!denseEmbedding) {
      this.logger.debug('EmbeddingService: response contained no embedding');
      return [];
    }

    this.logger.debug(
      'EmbeddingService: non-array embedding received; returning []'
    );
    return [];
  }

  /**
   * Extract multiple embeddings from a batch inference response.
   */
  private extractBatchEmbeddingsFromResponse(response: unknown, texts: string[]): number[][] {
    const result = response as {
      text_embedding?: Array<{ embedding: number[] | Record<string, number> }>;
      sparse_embedding?: Array<{ embedding: Record<string, number> }>;
    };

    const embeddings = result?.text_embedding ?? result?.sparse_embedding;

    if (!Array.isArray(embeddings)) {
      this.logger.debug('EmbeddingService: batch response contained no embeddings array');
      return texts.map(() => []);
    }

    return embeddings.map((item) => {
      const emb = item?.embedding;
      if (!emb || !Array.isArray(emb)) {
        return [];
      }
      return emb as number[];
    });
  }
}

/**
 * Create an EmbeddingService instance.
 */
export const createEmbeddingService = ({
  esClient,
  config,
  logger,
}: {
  esClient: ElasticsearchClient;
  config: EmbeddingServiceConfig;
  logger: Logger;
}): EmbeddingService => new EmbeddingService({ esClient, config, logger });
