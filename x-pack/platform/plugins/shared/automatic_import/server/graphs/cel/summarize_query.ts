/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StringOutputParser } from '@langchain/core/output_parsers';
import { CelInputState } from '../../types';
import { CEL_QUERY_SUMMARY_PROMPT } from './prompts';
import { CelInputNodeParams } from './types';

export async function handleSummarizeQuery({
  state,
  model,
}: CelInputNodeParams): Promise<Partial<CelInputState>> {
  const outputParser = new StringOutputParser();
  const celSummarizeGraph = CEL_QUERY_SUMMARY_PROMPT.pipe(model).pipe(outputParser);

  const apiQuerySummary = await celSummarizeGraph.invoke({
    data_stream_name: state.dataStreamName,
    path: state.path,
    path_details: state.openApiPathDetails,
  });

  return {
    apiQuerySummary,
    lastExecutedChain: 'summarizeQuery',
  };
}
