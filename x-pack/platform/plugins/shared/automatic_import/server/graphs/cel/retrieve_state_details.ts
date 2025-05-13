/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import { CelInputState } from '../../types';
import { EX_ANSWER_CONFIG } from './constants';
import { CEL_CONFIG_DETAILS_PROMPT } from './prompts';
import { CelInputNodeParams, CelInputStateDetails } from './types';
import {
  getRedactVariables,
  getStateVarsAndDefaultValues,
  getStateVarsConfigDetails,
} from './util';

export async function handleGetStateDetails({
  state,
  model,
}: CelInputNodeParams): Promise<Partial<CelInputState>> {
  const outputParser = new JsonOutputParser();
  const celConfigGraph = CEL_CONFIG_DETAILS_PROMPT.pipe(model).pipe(outputParser);

  const stateDetails = (await celConfigGraph.invoke({
    state_variables: state.stateVarNames,
    open_api_path_details: state.openApiPathDetails,
    ex_answer: EX_ANSWER_CONFIG,
  })) as CelInputStateDetails[];

  const stateSettings = getStateVarsAndDefaultValues(stateDetails);
  const configFields = getStateVarsConfigDetails(stateDetails);
  const redactVars = getRedactVariables(stateDetails);

  return {
    stateSettings,
    configFields,
    redactVars,
    lastExecutedChain: 'getStateDetails',
  };
}
