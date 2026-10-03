/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { InferenceModelState } from '../../common';
import { getSystemPrompt } from '../prompts/system_prompt';
import { getInferenceIdFromWriteIndex } from '../service/knowledge_base_service/get_inference_id_from_write_index';
import { registerKibanaFunction } from './kibana';
import { registerContextFunction } from './context/context';
import { registerSummarizationFunction } from './summarize';
import type { RegistrationCallback } from '../service/types';
import { registerElasticsearchFunction, registerRetrieveEsApiDocFunction } from './elasticsearch';
import { registerGetDatasetInfoFunction } from './get_dataset_info';
import { registerExecuteConnectorFunction } from './execute_connector';

export type FunctionRegistrationParameters = Omit<
  Parameters<RegistrationCallback>[0],
  'registerContext' | 'hasFunction' | 'pluginsStart'
>;

export const registerFunctions: RegistrationCallback = async ({
  client,
  functions,
  resources,
  signal,
  scopes,
  pluginsStart,
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

  const { inferenceModelState } = await client.getKnowledgeBaseStatus();
  const isKnowledgeBaseReady = inferenceModelState === InferenceModelState.READY;

  // determine if product documentation is installed
  const llmTasks = pluginsStart?.llmTasks;
  const esClient = (await resources.context.core).elasticsearch.client;
  const inferenceId =
    (await getInferenceIdFromWriteIndex(esClient, resources.logger)) ??
    defaultInferenceEndpoints.ELSER;
  const isProductDocAvailable = llmTasks
    ? await llmTasks.retrieveDocumentationAvailable({ inferenceId })
    : false;

  functions.registerInstruction(({ availableFunctionNames }) =>
    getSystemPrompt({
      availableFunctionNames,
      isServerless,
      isKnowledgeBaseReady,
      isObservabilityDeployment,
      isGenericDeployment,
      isProductDocAvailable,
    })
  );

  if (isKnowledgeBaseReady) {
    registerSummarizationFunction(registrationParameters);
  }

  registerContextFunction({ ...registrationParameters, isKnowledgeBaseReady });

  registerRetrieveEsApiDocFunction(registrationParameters);
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
