/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import { CelInputState } from '../../types';
import { EX_ANSWER_STATE } from './constants';
import { CEL_STATE_PROMPT } from './prompts';
import { CelInputNodeParams } from './types';

export async function handleGetStateVariables({
  state,
  model,
}: CelInputNodeParams): Promise<Partial<CelInputState>> {
  const outputParser = new JsonOutputParser();
  const celStateGraph = CEL_STATE_PROMPT.pipe(model).pipe(outputParser);

  const celState = await celStateGraph.invoke({
    cel_program: state.currentProgram,
    ex_answer: EX_ANSWER_STATE,
  });

  // Return all state vars besides the URL as it gets included automatically
  const filteredState = celState.filter((stateVar: string) => stateVar !== 'url');

  return {
    stateVarNames: filteredState,
    lastExecutedChain: 'getStateVars',
  };
}
