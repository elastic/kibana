/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseFeature } from '@kbn/significant-events-schema';
import { codeAnalysisGenerator } from './code_analysis';
import { datasetAnalysisGenerator } from './dataset_analysis';
import { errorLogsGenerator } from './error_logs';
import { logPatternsGenerator } from './log_patterns';
import { logSamplesGenerator } from './log_samples';
import type { ComputedFeatureGenerator, ComputedFeatureGeneratorOptions } from './types';

/**
 * Internal registry for computed feature generators.
 * Ensures each feature type is unique.
 */
class ComputedFeatureRegistry {
  private generators = new Map<string, ComputedFeatureGenerator>();

  register(generator: ComputedFeatureGenerator): void {
    if (this.generators.has(generator.type)) {
      throw new Error(`Computed feature type "${generator.type}" is already registered`);
    }
    this.generators.set(generator.type, generator);
  }

  getAll(): ComputedFeatureGenerator[] {
    return Array.from(this.generators.values());
  }
}

/**
 * Internal registry instance.
 *
 * To add a new computed feature:
 * 1. Create a new file in this folder implementing ComputedFeatureGenerator
 * 2. Import and add your generator to the array below
 */
const registry = new ComputedFeatureRegistry();

const generators: ComputedFeatureGenerator[] = [
  datasetAnalysisGenerator,
  logSamplesGenerator,
  logPatternsGenerator,
  errorLogsGenerator,
  codeAnalysisGenerator,
];

generators.forEach((generator) => registry.register(generator));

/**
 * Returns formatted LLM instructions for all computed feature types.
 * This is automatically included in prompts so the LLM knows how to use each feature type.
 *
 * `excludedTypes` skips types a consumer never receives, so the prompt won't
 * describe a feature type that never appears in tool results.
 */
export function getComputedFeatureInstructions(excludedTypes: readonly string[] = []): string {
  return registry
    .getAll()
    .filter((generator) => !excludedTypes.includes(generator.type))
    .map((generator) => `**${generator.type}**: ${generator.llmInstructions}`)
    .join('\n\n');
}

/**
 * Converts a generator and its computed value into a BaseFeature.
 */
function toComputedFeature(
  generator: ComputedFeatureGenerator,
  value: Record<string, unknown>,
  streamName: string
): BaseFeature {
  return {
    id: generator.type,
    stream_name: streamName,
    description: generator.description,
    type: generator.type,
    properties: value,
    confidence: 100,
  };
}

export interface ComputedFeatureGenerationResult {
  features: BaseFeature[];
  errors: Array<{ feature: string; error: string }>;
}

export const DEFAULT_COMPUTED_FEATURES_TIMEOUT_MS = 60_000;

/** `signal` is absent here — it is built from `requestSignal` and `timeoutMs`. */
export interface GenerateAllComputedFeaturesOptions
  extends Omit<ComputedFeatureGeneratorOptions, 'signal'> {
  requestSignal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Generates all computed features by running every registered generator against
 * one shared abort signal (request signal combined with a timeout).
 *
 * Best-effort: a rejected generator is logged and skipped so one failure doesn't
 * lose the others; `undefined` results (skips) are dropped too. Throws only when
 * failures leave zero features — a skip is not a failure.
 */
export async function generateAllComputedFeatures({
  requestSignal,
  timeoutMs = DEFAULT_COMPUTED_FEATURES_TIMEOUT_MS,
  ...baseOptions
}: GenerateAllComputedFeaturesOptions): Promise<ComputedFeatureGenerationResult> {
  const signal = AbortSignal.any([
    ...(requestSignal ? [requestSignal] : []),
    AbortSignal.timeout(timeoutMs),
  ]);
  const options: ComputedFeatureGeneratorOptions = { ...baseOptions, signal };

  const allGenerators = registry.getAll();
  const results = await Promise.allSettled(
    allGenerators.map((generator) => generator.generate(options))
  );

  const errors: Array<{ feature: string; error: string }> = [];
  const features: BaseFeature[] = [];

  for (const [index, result] of results.entries()) {
    const generator = allGenerators[index];
    if (result.status === 'rejected') {
      const message =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      options.logger.warn(`Computed feature generator "${generator.type}" failed: ${message}`);
      errors.push({ feature: generator.type, error: message });
    } else if (result.value !== undefined) {
      features.push(toComputedFeature(generator, result.value, options.target.id));
    }
  }

  if (features.length === 0 && errors.length > 0) {
    throw new Error(
      `All computed feature generators failed: ${errors.map((e) => e.error).join('; ')}`
    );
  }

  return { features, errors };
}
