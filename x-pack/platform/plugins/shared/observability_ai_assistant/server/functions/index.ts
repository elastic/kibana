/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KnowledgeBaseState } from '../../common';
import { registerContextFunction } from './context/context';
import { registerSummarizationFunction } from './summarize';
import type { RegistrationCallback } from '../service/types';
import { registerElasticsearchFunction } from './elasticsearch';
import { registerGetDatasetInfoFunction } from './get_dataset_info';
import { registerKibanaFunction } from './kibana';
import { registerExecuteConnectorFunction } from './execute_connector';
import { getObservabilitySystemPrompt } from '../prompts/system_prompt';

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

  if (isKnowledgeBaseReady) {
    registerSummarizationFunction(registrationParameters);
  } else {
    functions.registerInstruction(
      `You do not have a working memory. If the user expects you to remember the previous conversations, tell them they can set up the knowledge base.`
    );
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
