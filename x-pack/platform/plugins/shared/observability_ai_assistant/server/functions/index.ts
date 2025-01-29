/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { CONTEXT_FUNCTION_NAME, registerContextFunction } from './context';
import { registerSummarizationFunction, SUMMARIZE_FUNCTION_NAME } from './summarize';
import type { RegistrationCallback } from '../service/types';
import { registerElasticsearchFunction } from './elasticsearch';
import { GET_DATASET_INFO_FUNCTION_NAME, registerGetDatasetInfoFunction } from './get_dataset_info';
import { registerKibanaFunction } from './kibana';
import { registerExecuteConnectorFunction } from './execute_connector';
import { GET_DATA_ON_SCREEN_FUNCTION_NAME } from '../service/chat_function_client';

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
  if (scopes.includes('observability')) {
    functions.registerInstruction(`You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observability users to quickly assess what is happening in their observed systems. You can help them visualise and analyze data, investigate their systems, perform root cause analysis or identify optimisation opportunities.

    It's very important to not assume what the user is meaning. Ask them for clarification if needed.

    If you are unsure about which function should be used and with what arguments, ask the user for clarification or confirmation.

    In KQL ("kqlFilter")) escaping happens with double quotes, not single quotes. Some characters that need escaping are: ':()\\\
    /\". Always put a field value in double quotes. Best: service.name:\"opbeans-go\". Wrong: service.name:opbeans-go. This is very important!

    You can use Github-flavored Markdown in your responses. If a function returns an array, consider using a Markdown table to format the response.

    Note that ES|QL (the Elasticsearch Query Language which is a new piped language) is the preferred query language.

    If you want to call a function or tool, only call it a single time per message. Wait until the function has been executed and its results
    returned to you, before executing the same tool or another tool again if needed.

    DO NOT UNDER ANY CIRCUMSTANCES USE ES|QL syntax (\`service.name == "foo"\`) with "kqlFilter" (\`service.name:"foo"\`).

    The user is able to change the language which they want you to reply in on the settings page of the AI Assistant for Observability and Search, which can be found in the ${
      isServerless ? `Project settings.` : `Stack Management app under the option AI Assistants`
    }.
    If the user asks how to change the language, reply in the same language the user asked in.`);
  }

  if (scopes.length === 0 || (scopes.length === 1 && scopes[0] === 'all')) {
    functions.registerInstruction(
      `You are a helpful assistant for Elasticsearch. Your goal is to help Elasticsearch users accomplish tasks using Kibana and Elasticsearch. You can help them construct queries, index data, search data, use Elasticsearch APIs, generate sample data, visualise and analyze data.

  It's very important to not assume what the user means. Ask them for clarification if needed.

  If you are unsure about which function should be used and with what arguments, ask the user for clarification or confirmation.

  In KQL ("kqlFilter")) escaping happens with double quotes, not single quotes. Some characters that need escaping are: ':()\\\
  /\". Always put a field value in double quotes. Best: service.name:\"opbeans-go\". Wrong: service.name:opbeans-go. This is very important!

  You can use Github-flavored Markdown in your responses. If a function returns an array, consider using a Markdown table to format the response.

  If you want to call a function or tool, only call it a single time per message. Wait until the function has been executed and its results
  returned to you, before executing the same tool or another tool again if needed.

  The user is able to change the language which they want you to reply in on the settings page of the AI Assistant for Observability and Search, which can be found in the ${
    isServerless ? `Project settings.` : `Stack Management app under the option AI Assistants`
  }.
  If the user asks how to change the language, reply in the same language the user asked in.`
    );
  }

  const { ready: isKnowledgeBaseReady } = await client.getKnowledgeBaseStatus();

  functions.registerInstruction(({ availableFunctionNames }) => {
    const instructions: string[] = [];

    if (
      availableFunctionNames.includes(QUERY_FUNCTION_NAME) &&
      availableFunctionNames.includes(GET_DATASET_INFO_FUNCTION_NAME)
    ) {
      instructions.push(`You MUST use the "${GET_DATASET_INFO_FUNCTION_NAME}" ${
        functions.hasFunction('get_apm_dataset_info') ? 'or the get_apm_dataset_info' : ''
      } function before calling the "${QUERY_FUNCTION_NAME}" or the "changes" functions.

      If a function requires an index, you MUST use the results from the dataset info functions.`);
    }

    if (availableFunctionNames.includes(GET_DATA_ON_SCREEN_FUNCTION_NAME)) {
      instructions.push(`You have access to data on the screen by calling the "${GET_DATA_ON_SCREEN_FUNCTION_NAME}" function.
        Use it to help the user understand what they are looking at. A short summary of what they are looking at is available in the return of the "${CONTEXT_FUNCTION_NAME}" function.
        Data that is compact enough automatically gets included in the response for the "${CONTEXT_FUNCTION_NAME}" function.`);
    }

    if (isKnowledgeBaseReady) {
      if (availableFunctionNames.includes(SUMMARIZE_FUNCTION_NAME)) {
        instructions.push(`You can use the "${SUMMARIZE_FUNCTION_NAME}" function to store new information you have learned in a knowledge database.
          Only use this function when the user asks for it.
          All summaries MUST be created in English, even if the conversation was carried out in a different language.`);
      }

      if (availableFunctionNames.includes(CONTEXT_FUNCTION_NAME)) {
        instructions.push(
          `Additionally, you can use the "${CONTEXT_FUNCTION_NAME}" function to retrieve relevant information from the knowledge database.`
        );
      }
    } else {
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
