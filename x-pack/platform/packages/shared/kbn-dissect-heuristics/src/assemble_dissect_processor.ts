/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectProcessor } from '@kbn/streamlang';
import type { ReviewFields, NormalizedReviewResult } from './review/get_review_fields';
import { extractDissectPattern } from './extract_dissect_pattern';
import { groupMessagesByPattern } from './group_messages';
import { getReviewFields } from './review/get_review_fields';
import { getDissectProcessorWithReview } from './review/get_dissect_processor_with_review';

export type DissectReviewFn = (
  reviewFields: ReviewFields,
  messages: string[]
) => Promise<NormalizedReviewResult>;

const MAX_REVIEW_MESSAGES = 10;
const NUM_REVIEW_EXAMPLES = 10;

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
export const assembleDissectProcessor = async ({
  from,
  messages,
  reviewFn,
}: AssembleDissectProcessorParams): Promise<DissectProcessor | null> => {
  const grouped = groupMessagesByPattern(messages);
  if (grouped.length === 0) return null;

  const largestGroup = grouped[0];
  const dissectPattern = extractDissectPattern(largestGroup.messages);
  if (!dissectPattern.ast.nodes.length) return null;

  const reviewFields = getReviewFields(dissectPattern, NUM_REVIEW_EXAMPLES);
  const reviewResult = await reviewFn(
    reviewFields,
    largestGroup.messages.slice(0, MAX_REVIEW_MESSAGES)
  );

  const result = getDissectProcessorWithReview(dissectPattern, reviewResult, from);

  if (!result.pattern || result.pattern.trim().length === 0) return null;

  return {
    action: 'dissect',
    from,
    pattern: result.pattern,
    append_separator: result.processor.dissect.append_separator,
    description: result.description,
  };
};
