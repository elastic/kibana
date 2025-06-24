/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { KnowledgeBaseState } from '../../common';
import { CONTEXT_FUNCTION_NAME, registerContextFunction } from './context/context';
import { registerSummarizationFunction } from './summarize';
import type { RegistrationCallback } from '../service/types';
import { registerElasticsearchFunction } from './elasticsearch';
import { registerGetDatasetInfoFunction } from './get_dataset_info';
import { registerKibanaFunction } from './kibana';
import { registerExecuteConnectorFunction } from './execute_connector';
import { GET_DATA_ON_SCREEN_FUNCTION_NAME } from './get_data_on_screen';
import { getObservabilitySystemPrompt } from '../prompts/system_prompt';

// cannot be imported from x-pack/solutions/observability/plugins/observability_ai_assistant_app/server/functions/query/index.ts due to circular dependency
export const QUERY_FUNCTION_NAME = 'query';

export type FunctionRegistrationParameters = Omit<
  Parameters<RegistrationCallback>[0],
  'registerContext' | 'hasFunction'
>;

export const registerFunctions: RegistrationCallback = async ({
  client,
  functions,
  resources,
  signal,
  scopes,
}) => {
  const registrationParameters: FunctionRegistrationParameters = {
    client,
    functions,
    resources,
    signal,
    scopes,
  };

  const isServerless = !!resources.plugins.serverless;

  const isObservabilityDeployment = scopes.includes('observability');
  const isGenericDeployment = scopes.length === 0 || (scopes.length === 1 && scopes[0] === 'all');

  const { kbState } = await client.getKnowledgeBaseStatus();
  const isKnowledgeBaseReady = kbState === KnowledgeBaseState.READY;

  if (isObservabilityDeployment || isGenericDeployment) {
    functions.registerInstruction(({ availableFunctionNames }) =>
      getObservabilitySystemPrompt({
        availableFunctionNames,
        isServerless,
        isKnowledgeBaseReady,
        isObservabilityDeployment,
      })
    );
  }

  functions.registerInstruction(({ availableFunctionNames }) => {
    const instructions: string[] = [];

    if (availableFunctionNames.includes(GET_DATA_ON_SCREEN_FUNCTION_NAME)) {
      instructions.push(`You have access to data on the screen by calling the "${GET_DATA_ON_SCREEN_FUNCTION_NAME}" function.
        Use it to help the user understand what they are looking at. A short summary of what they are looking at is available in the return of the "${CONTEXT_FUNCTION_NAME}" function.
        Data that is compact enough automatically gets included in the response for the "${CONTEXT_FUNCTION_NAME}" function.`);
    }

    if (!isKnowledgeBaseReady) {
      instructions.push(
        `You do not have a working memory. If the user expects you to remember the previous conversations, tell them they can set up the knowledge base.`
      );
    }

    return instructions.map((instruction) => dedent(instruction));
  });

  if (isKnowledgeBaseReady) {
    registerSummarizationFunction(registrationParameters);
  }

  registerContextFunction({ ...registrationParameters, isKnowledgeBaseReady });

  registerElasticsearchFunction(registrationParameters);
  const request = registrationParameters.resources.request;

  if ('id' in request) {
    registerKibanaFunction({
      ...registrationParameters,
      resources: {
        ...registrationParameters.resources,
        request,
      },
    });
  }
  registerGetDatasetInfoFunction(registrationParameters);

  registerExecuteConnectorFunction(registrationParameters);
};
