/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import { CATEGORIZATION_REVIEW_PROMPT } from './prompts';
import type { Pipeline } from '../../../common';
import type { CategorizationNodeParams } from './types';
import type { SimplifiedProcessors, SimplifiedProcessor, CategorizationState } from '../../types';
import { combineProcessors } from '../../util/processors';
import { ECS_EVENT_TYPES_PER_CATEGORY } from './constants';
import { selectResults } from './util';
import { CATEROGIZATION_REVIEW_BATCH_SIZE } from '../../../common/constants';

export async function handleReview({
  state,
  model,
}: CategorizationNodeParams): Promise<Partial<CategorizationState>> {
  const categorizationReviewPrompt = CATEGORIZATION_REVIEW_PROMPT;
  const outputParser = new JsonOutputParser();
  const categorizationReview = categorizationReviewPrompt.pipe(model).pipe(outputParser);

  const [pipelineResults, selectedIndices] = selectResults(
    state.pipelineResults,
    CATEROGIZATION_REVIEW_BATCH_SIZE,
    new Set(state.stableSamples)
  );

  const currentProcessors = (await categorizationReview.invoke({
    current_processors: JSON.stringify(state.currentProcessors, null, 2),
    pipeline_results: JSON.stringify(pipelineResults, null, 2),
    previous_invalid_categorization: state.previousInvalidCategorization,
    previous_error: state.previousError,
    ex_answer: state?.exAnswer,
    package_name: state?.packageName,
    compatibility_matrix: JSON.stringify(ECS_EVENT_TYPES_PER_CATEGORY, null, 2),
  })) as SimplifiedProcessor[];

  const processors = {
    type: 'categorization',
    processors: currentProcessors,
  } as SimplifiedProcessors;

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, processors);

  return {
    currentPipeline,
    currentProcessors,
    reviewCount: state.reviewCount + 1,
    lastReviewedSamples: selectedIndices,
    lastExecutedChain: 'review',
  };
}
