import type { DissectPattern, DissectProcessorResult } from './types';
/**
 * Generates an Elasticsearch Dissect processor configuration from a Dissect pattern.
 *
 * @param pattern - The DissectPattern object containing AST and field metadata
 * @param sourceField - The source field to apply dissect to (default: 'message')
 * @returns DissectProcessorResult with processor config and metadata
 */
export declare function getDissectProcessor(pattern: DissectPattern, sourceField?: string): DissectProcessorResult;
