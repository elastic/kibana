import type { DissectPattern, DissectProcessorResult } from '../types';
import type { NormalizedReviewResult } from './get_review_fields';
/**
 * Generates a Dissect processor by combining extracted pattern and
 * the result of an LLM review. It replaces generic field names (field_1, field_2, etc.)
 * with ECS-compliant field names and handles field grouping.
 */
export declare function getDissectProcessorWithReview(pattern: DissectPattern, reviewResult: NormalizedReviewResult, sourceField?: string): DissectProcessorResult;
