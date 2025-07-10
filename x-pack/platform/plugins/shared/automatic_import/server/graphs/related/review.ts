/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { Pipeline } from '../../../common';
import type { RelatedState, SimplifiedProcessors, SimplifiedProcessor } from '../../types';
import type { RelatedNodeParams } from './types';
import { combineProcessors } from '../../util/processors';
import { RELATED_REVIEW_PROMPT } from './prompts';
import { deepCopySkipArrays } from './util';

export async function handleReview({
  state,
  model,
}: RelatedNodeParams): Promise<Partial<RelatedState>> {
  const relatedReviewPrompt = RELATED_REVIEW_PROMPT;
  const outputParser = new JsonOutputParser();
  const relatedReviewGraph = relatedReviewPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await relatedReviewGraph.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    ex_answer: state.exAnswer,
    previous_error: state.previousError,
    pipeline_results: JSON.stringify(state.pipelineResults.map(deepCopySkipArrays), null, 2),
  })) as SimplifiedProcessor[];

  const processors = {
    type: 'related',
    processors: currentProcessors,
  } as SimplifiedProcessors;

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, processors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: true,
    lastExecutedChain: 'review',
  };
}
