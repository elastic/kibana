import type { DissectProcessor } from '@kbn/streamlang';
import type { ReviewFields, NormalizedReviewResult } from './review/get_review_fields';
export type DissectReviewFn = (reviewFields: ReviewFields, messages: string[]) => Promise<NormalizedReviewResult>;
export interface AssembleDissectProcessorParams {
    from: string;
    messages: string[];
    reviewFn: DissectReviewFn;
}
/**
 * Orchestrates the full dissect processor assembly pipeline:
 *   1. Group messages by structural pattern
 *   2. Extract a dissect pattern from the largest group
 *   3. Compute review fields from the extracted pattern
 *   4. Call the provided reviewFn (LLM review) with those fields
 *   5. Assemble and return a Streamlang DissectProcessor
 *
 * Callers supply their own reviewFn to handle LLM transport
 * (streaming API, in-process call, kbnClient.request, etc.).
 *
 * Messages passed to reviewFn are truncated to avoid polluting
 * the LLM context.
 */
export declare const assembleDissectProcessor: ({ from, messages, reviewFn, }: AssembleDissectProcessorParams) => Promise<DissectProcessor | null>;
