/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ApiAnalysisState } from '../../types';
import { ApiAnalysisNodeParams } from './types';
import { SUGGESTED_PATHS_PROMPT } from './prompts';
import { EX_ANSWER_PATHS } from './constants';

export async function handleGetSuggestedPaths({
  state,
  model,
}: ApiAnalysisNodeParams): Promise<Partial<ApiAnalysisState>> {
  const outputParser = new JsonOutputParser();
  const suggestedPathsGraph = SUGGESTED_PATHS_PROMPT.pipe(model).pipe(outputParser);

  const paths = await suggestedPathsGraph.invoke({
    data_stream_title: state.dataStreamName,
    path_options: state.pathOptions,
    ex_answer: EX_ANSWER_PATHS,
  });

  return {
    suggestedPaths: paths as string[],
    lastExecutedChain: 'getSuggestedPaths',
  };
}
