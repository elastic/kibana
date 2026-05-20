import type { BaseFeature } from '@kbn/streams-schema';
import type { ComputedFeatureGeneratorOptions } from './types';
/**
 * Returns formatted LLM instructions for all computed feature types.
 * This is automatically included in prompts so the LLM knows how to use each feature type.
 */
export declare function getComputedFeatureInstructions(): string;
/**
 * Generates all computed features by running all registered generators in parallel.
 */
export declare function generateAllComputedFeatures(options: ComputedFeatureGeneratorOptions): Promise<BaseFeature[]>;
