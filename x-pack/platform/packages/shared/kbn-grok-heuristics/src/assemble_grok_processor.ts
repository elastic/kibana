/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokProcessor } from '@kbn/streamlang';
import type { GrokPatternNode } from './types';
import type { ReviewFields, NormalizedReviewResult } from './review/get_review_fields';
import type { GrokProcessorResult } from './review/get_grok_processor';
import { getReviewFields } from './review/get_review_fields';
import { getGrokProcessor } from './review/get_grok_processor';
import { mergeGrokProcessors } from './review/merge_grok_processors';

export type GrokReviewFn = (
  reviewFields: ReviewFields,
  messages: string[]
) => Promise<NormalizedReviewResult>;

const MAX_REVIEW_MESSAGES = 10;
const NUM_REVIEW_EXAMPLES = 10;

export interface AssembleGrokProcessorParams {
  from: string;
  patternGroups: Array<{ messages: string[]; nodes: GrokPatternNode[] }>;
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
export const assembleGrokProcessor = async ({
  from,
  patternGroups,
  reviewFn,
}: AssembleGrokProcessorParams): Promise<GrokProcessor | null> => {
  const results = await Promise.allSettled(
    patternGroups.map(async (group) => {
      const reviewFields = getReviewFields(group.nodes, NUM_REVIEW_EXAMPLES);
      const reviewResult = await reviewFn(
        reviewFields,
        group.messages.slice(0, MAX_REVIEW_MESSAGES)
      );
      return getGrokProcessor(group.nodes, reviewResult);
    })
  );

  const processors = results.reduce<GrokProcessorResult[]>((acc, r) => {
    if (r.status === 'fulfilled') acc.push(r.value);
    return acc;
  }, []);

  if (processors.length === 0) return null;

  const merged = mergeGrokProcessors(processors);

  const filteredPatterns = merged.patterns.filter((p) => p.trim().length > 0);
  if (filteredPatterns.length === 0) return null;

  return {
    action: 'grok',
    from,
    patterns: filteredPatterns,
    pattern_definitions: merged.pattern_definitions,
    description: merged.description,
  };
};
