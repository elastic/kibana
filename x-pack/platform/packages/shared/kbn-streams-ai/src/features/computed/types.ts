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
 * The result returned by a computed feature generator.
 * The framework automatically sets:
 * - name = type
 * - category = 'computed'
 *
 * The ID for computed features is generated using only stream + type,
 * so the value can change without creating duplicate features.
 */
export interface ComputedFeatureGeneratorResult {
  /** Human-readable description of what this feature represents */
  description: string;
  /** The computed value/data for this feature (analysis results, samples, etc.) */
  properties: Record<string, any>;
}

/**
 * Interface for computed feature generators.
 * Each generator is responsible for producing a specific type of computed feature.
 *
 * The framework enforces that:
 * - name = type (set automatically)
 * - ID is generated using only stream + type (so value can change without duplicates)
 *
 * To add a new computed feature:
 * 1. Create a new file in this folder implementing ComputedFeatureGenerator
 * 2. Add the generator to the computedFeatureGenerators array in index.ts
 */
export interface ComputedFeatureGenerator {
  /**
   * Unique type identifier for this computed feature.
   * This is also used as the feature's name to ensure consistent ID generation.
   */
  type: string;

  /**
   * Instructions for the LLM on how to use this computed feature.
   * This is automatically included in prompts so the LLM knows how to leverage this feature.
   *
   * Example: "Contains the full schema, field distributions, and sample values from the log dataset.
   * Use the `value.analysis` field to understand available fields and their value distributions."
   */
  llmInstructions: string;

  /**
   * Generates the variable parts of the computed feature.
   * @returns The description and value, or null if the feature should be skipped.
   */
  generate: (options: ComputedFeatureGeneratorOptions) => Promise<ComputedFeatureGeneratorResult>;
}
