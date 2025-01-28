/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { UnstructuredLogState } from '../../types';
import type { HandleUnstructuredNodeParams } from './types';
import { GROK_ERROR_PROMPT } from './prompts';
import { GROK_ERROR_EXAMPLE_ANSWER } from './constants';

export async function handleUnstructuredError({
  state,
  model,
}: HandleUnstructuredNodeParams): Promise<Partial<UnstructuredLogState>> {
  const outputParser = new JsonOutputParser();
  const grokErrorGraph = GROK_ERROR_PROMPT.pipe(model).pipe(outputParser);
  const currentPatterns = state.grokPatterns;

  const pattern = await grokErrorGraph.invoke({
    packageName: state.packageName,
    dataStreamName: state.dataStreamName,
    current_pattern: JSON.stringify(currentPatterns, null, 2),
    errors: JSON.stringify(state.errors, null, 2),
    ex_answer: JSON.stringify(GROK_ERROR_EXAMPLE_ANSWER, null, 2),
  });

  return {
    grokPatterns: pattern.grok_patterns,
    lastExecutedChain: 'unstructuredError',
  };
}
