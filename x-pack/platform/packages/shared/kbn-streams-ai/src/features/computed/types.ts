/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Streams } from '@kbn/streams-schema';

/**
 * Options passed to each computed feature generator.
 */
export interface ComputedFeatureGeneratorOptions {
  stream: Streams.all.Definition;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
}

/**
 * Interface for computed feature generators.
 * Each generator is responsible for producing a specific type of computed feature.
 */
export interface ComputedFeatureGenerator {
  /**
   * Unique type identifier for this computed feature.
   * This is also used as the feature's name to ensure consistent ID generation.
   */
  type: string;

  /**
   * Human-readable description of what this feature represents.
   */
  description: string;

  /**
   * Instructions for the LLM on how to use this computed feature.
   * This is automatically included in prompts so the LLM knows how to leverage this feature.
   */
  llmInstructions: string;

  /**
   * Generates the computed value for this feature.
   * @returns The computed value/data (analysis results, samples, etc.)
   */
  generate: (options: ComputedFeatureGeneratorOptions) => Promise<Record<string, unknown>>;
}
