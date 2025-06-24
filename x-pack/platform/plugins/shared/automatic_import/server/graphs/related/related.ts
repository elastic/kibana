/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { Pipeline } from '../../../common';
import type { RelatedState, SimplifiedProcessor, SimplifiedProcessors } from '../../types';
import { combineProcessors } from '../../util/processors';
import { RELATED_MAIN_PROMPT } from './prompts';
import type { RelatedNodeParams } from './types';
import { deepCopySkipArrays } from './util';

export async function handleRelated({
  state,
  model,
}: RelatedNodeParams): Promise<Partial<RelatedState>> {
  const relatedMainPrompt = RELATED_MAIN_PROMPT;
  const outputParser = new JsonOutputParser();
  const relatedMainGraph = relatedMainPrompt.pipe(model).pipe(outputParser);

  const currentProcessors = (await relatedMainGraph.invoke({
    pipeline_results: JSON.stringify(state.pipelineResults.map(deepCopySkipArrays), null, 2),
    ex_answer: state.exAnswer,
    ecs: state.ecs,
  })) as SimplifiedProcessor[];

  const processors = {
    type: 'related',
    processors: currentProcessors,
  } as SimplifiedProcessors;

  const currentPipeline = combineProcessors(state.initialPipeline as Pipeline, processors);

  return {
    currentPipeline,
    currentProcessors,
    reviewed: false,
    hasTriedOnce: true,
    lastExecutedChain: 'related',
  };
}
