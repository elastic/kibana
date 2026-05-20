import type { GrokProcessor } from '@kbn/streamlang';
import type { GrokPatternNode } from './types';
import type { ReviewFields, NormalizedReviewResult } from './review/get_review_fields';
export type GrokReviewFn = (reviewFields: ReviewFields, messages: string[]) => Promise<NormalizedReviewResult>;
export interface AssembleGrokProcessorParams {
    from: string;
    patternGroups: Array<{
        messages: string[];
        nodes: GrokPatternNode[];
    }>;
    reviewFn: GrokReviewFn;
}
/**
 * Orchestrates the full grok processor assembly pipeline:
 *   1. For each pattern group, compute review fields from nodes
 *   2. Call the provided reviewFn (LLM review) with those fields
 *   3. Assemble a GrokProcessorResult from nodes + review
 *   4. Merge all per-group processors into one
 *   5. Return a Streamlang GrokProcessor ready for simulation/use
 *
 * Callers supply their own reviewFn to handle LLM transport
 * (streaming API, in-process call, kbnClient.request, etc.).
 *
 * Messages passed to reviewFn are truncated to avoid polluting
 * the LLM context. Groups are processed in parallel via
 * Promise.allSettled; individual failures are silently dropped
 * so partial results still produce a merged processor.
 */
export declare const assembleGrokProcessor: ({ from, patternGroups, reviewFn, }: AssembleGrokProcessorParams) => Promise<GrokProcessor | null>;
