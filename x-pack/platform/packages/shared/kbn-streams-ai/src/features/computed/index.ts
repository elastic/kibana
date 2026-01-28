/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFeature } from '@kbn/streams-schema';
import { datasetAnalysisGenerator } from './dataset_analysis';
import type {
  ComputedFeatureGenerator,
  ComputedFeatureGeneratorOptions,
  ComputedFeatureGeneratorResult,
} from './types';

export type { ComputedFeatureGenerator, ComputedFeatureGeneratorOptions };

/**
 * Registry of all computed feature generators.
 *
 * To add a new computed feature:
 * 1. Create a new file in this folder implementing ComputedFeatureGenerator
 * 2. Import and add your generator to this array
 *
 * Each generator must provide:
 * - type: Unique identifier for the feature
 * - llmInstructions: How the LLM should use this feature (auto-included in prompts)
 * - generate: Function that produces the feature's description and value
 */
export const computedFeatureGenerators: ComputedFeatureGenerator[] = [
  datasetAnalysisGenerator,
  // Add new generators here - one line per feature
];

/**
 * Returns formatted LLM instructions for all computed feature types.
 * This is automatically included in prompts so the LLM knows how to use each feature type.
 */
export function getComputedFeatureInstructions(): string {
  return computedFeatureGenerators
    .map((generator) => `**${generator.type}**: ${generator.llmInstructions}`)
    .join('\n\n');
}

/**
 * Converts a generator result into a full ComputedBaseFeature.
 * Enforces that name = type. The ID is generated using only stream + type,
 * so the value can change without creating duplicate features.
 */
function toComputedFeature(type: string, result: ComputedFeatureGeneratorResult): BaseFeature {
  return {
    type,
    description: result.description,
    properties: result.properties,
    confidence: 100,
    evidence: [],
    tags: [],
    meta: {},
    id: type,
  };
}

/**
 * Generates all computed features by running all registered generators in parallel.
 * Generators that return null are filtered out from the results.
 *
 * The framework automatically sets name = type. The ID is generated using
 * only stream + type, so value changes update the existing feature.
 */
export async function generateAllComputedFeatures(
  options: ComputedFeatureGeneratorOptions
): Promise<BaseFeature[]> {
  return Promise.all(
    computedFeatureGenerators.map(async (generator) => {
      const result = await generator.generate(options);
      return toComputedFeature(generator.type, result);
    })
  );
}
