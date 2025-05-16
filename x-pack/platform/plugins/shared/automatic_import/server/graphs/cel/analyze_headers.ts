/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StringOutputParser } from '@langchain/core/output_parsers';
import { CelInputState } from '../../types';
import { CEL_ANALYZE_HEADERS_PROMPT } from './prompts';
import { CelInputNodeParams } from './types';

export async function handleAnalyzeHeaders({
  state,
  model,
}: CelInputNodeParams): Promise<Partial<CelInputState>> {
  const outputParser = new StringOutputParser();
  const celProgramGraph = CEL_ANALYZE_HEADERS_PROMPT.pipe(model).pipe(outputParser);

  const hasProgramHeadersResult = await celProgramGraph.invoke({
    cel_program: state.currentProgram,
  });

  return {
    hasProgramHeaders: JSON.parse(hasProgramHeadersResult),
    lastExecutedChain: 'analyzeProgramHeaders',
  };
}
