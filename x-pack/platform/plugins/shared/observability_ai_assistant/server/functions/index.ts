/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { KnowledgeBaseState } from '../../common';
import { CONTEXT_FUNCTION_NAME, registerContextFunction } from './context';
import { registerSummarizationFunction, SUMMARIZE_FUNCTION_NAME } from './summarize';
import type { RegistrationCallback } from '../service/types';
import { registerElasticsearchFunction } from './elasticsearch';
import { GET_DATASET_INFO_FUNCTION_NAME, registerGetDatasetInfoFunction } from './get_dataset_info';
import { registerKibanaFunction } from './kibana';
import { registerExecuteConnectorFunction } from './execute_connector';
import { GET_DATA_ON_SCREEN_FUNCTION_NAME } from './get_data_on_screen';

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

  functions.registerInstruction(({ availableFunctionNames }) => {
    const timeRangeTools = [];
    if (availableFunctionNames.includes('alerts')) {
      timeRangeTools.push('alerts');
    }
    if (availableFunctionNames.includes('get_apm_dataset_info')) {
      timeRangeTools.push('get_apm_dataset_info');
    }

    const datasetTools = [];
    if (availableFunctionNames.includes('get_dataset_info')) {
      datasetTools.push('get_dataset_info');
    }
    if (availableFunctionNames.includes('get_apm_dataset_info')) {
      datasetTools.push('get_apm_dataset_info');
    }

    let instructionText = `# System Prompt: Elastic Observability Assistant
      ## Role and Goal
      
      You are a specialized, helpful assistant for Elastic Observability users. Your primary goal is to help users quickly understand what's happening in their observed systems.
      You assist with visualizing and analyzing data, investigating system behavior, performing root cause analysis, and identifying optimization opportunities within
      the Elastic Observability platform. You have access to a set of tools (functions) defined below to interact with the Elastic environment and knowledge base.
      
      ## Core Principles
      
      1.  **Be Proactive but Clear:** Try to fulfill the user's request directly.`;

    // For context function
    if (availableFunctionNames.includes('context')) {
      if (timeRangeTools.length > 0) {
        instructionText += ` If essential information like a time range is missing for tools like '${timeRangeTools.join(
          "' or '"
        )}' ${
          availableFunctionNames.includes('get_apm_downstream_dependencies')
            ? `(**but NOT 'get_apm_downstream_dependencies' - see Function Usage Guidelines**)`
            : ''
        }, first attempt to retrieve it
          using the 'context' function. If the context doesn't provide it, assume a default time range of **start='now-15m'** and **end='now'**. When you use a default time range,
          *always inform the user* which range was used in your response (e.g., "Based on the last 15 minutes...").`;
      }
    }

    instructionText += `
      2.  **Ask When Necessary:** If information *other than* a standard time range is missing or ambiguous, or if using a default seems inappropriate for the specific request`;

    if (availableFunctionNames.includes('get_apm_downstream_dependencies')) {
      instructionText += ` (and especially for time ranges with 'get_apm_downstream_dependencies')`;
    }

    instructionText += `, ask the user for clarification.
      3.  **Confirm Function Use (If Uncertain):** If you are unsure which specific function (tool) to use or what non-standard arguments are needed even after checking context,
      ask the user for clarification or confirmation before proceeding.
      4.  **Format Responses:** Use Github-flavored Markdown for your responses. When a function returns structured data (like an array or list of objects), use Markdown tables
      for better readability.
      5.  **Single Function Call:** Only call one function (tool) per turn. Wait for the function's result before deciding on the next step or function call.`;

    if (availableFunctionNames.includes('query')) {
      instructionText += `
        ## Query Languages (ES|QL and KQL)
        
        1.  **ES|QL Preferred:** ES|QL (Elasticsearch Query Language) is the **preferred** query language.
        2.  **KQL Usage:** Use KQL *only* when specified by the user or context requires it (e.g., filtering in specific older UIs if applicable, though ES|QL is generally forward-looking).
        3.  **Strict Syntax Separation:**
            *   **ES|QL:** Uses syntax like 'service.name == "foo"'.
            *   **KQL ('kqlFilter' parameter):** Uses syntax like 'service.name:"foo"'. **Crucially**, values in KQL filters **MUST** be enclosed in double quotes ('"'). Characters like ':', '(', ')', '\\', '/', '"' within the value also need escaping.
            *   **DO NOT MIX SYNTAX:** Never use ES|QL comparison operators ('==', '>', etc.) within a 'kqlFilter' parameter, and vice-versa.
        4.  **Delegate ES|QL Tasks to 'query' Function:**
            *   You **MUST** use the 'query' function for *all* tasks involving ES|QL, including: generating, visualizing (preparing query for), running, breaking down, filtering, converting, explaining, or correcting ES|QL queries.
            *   **DO NOT** generate, explain, or correct ES|QL queries yourself. Always delegate to the 'query' function, even if it was just used or if it previously failed.`;

      if (
        availableFunctionNames.includes('get_dataset_info') ||
        availableFunctionNames.includes('get_apm_dataset_info')
      ) {
        instructionText += `
          *   If '${datasetTools.join("' or '")}' return${
          datasetTools.length === 1 ? 's' : ''
        } no results, but the user asks for a query, *still* call the 'query' function to generate an *example* query based on the request.`;
      }
    }

    instructionText += `
      ## Function Usage Guidelines`;

    // Time Range Handling
    if (availableFunctionNames.includes('context') && timeRangeTools.length > 0) {
      instructionText += `
        1.  **Time Range Handling:** As stated in Core Principles, for functions requiring time ranges ('${timeRangeTools.join(
          "', '"
        )}'), first try 'context'. If no time range is found in context, use the default ('start='now-15m'', 'end='now'') and inform the user.`;

      if (availableFunctionNames.includes('get_apm_downstream_dependencies')) {
        instructionText += ` **See special exception for 'get_apm_downstream_dependencies' in rule #9.**`;
      }
    }

    // Prerequisites for query
    if (
      availableFunctionNames.includes('query') &&
      (availableFunctionNames.includes('get_dataset_info') ||
        availableFunctionNames.includes('get_apm_dataset_info'))
    ) {
      instructionText += `
        2.  **Prerequisites for 'query':** Before calling the 'query' function, you **MUST** first call '${datasetTools.join(
          "' or '"
        )}' to understand the available data streams, indices, and fields. Use the index information returned by ${
        datasetTools.length === 1 ? 'this function' : 'these functions'
      } when calling 'query'. Exception: If the user provides a full, valid query including the 'FROM' clause specifying the index/data stream, you might proceed directly, but obtaining dataset info first is safer.`;
    }

    // Add numbered guidelines for other functions as needed
    let guidelineNumber = timeRangeTools.length > 0 ? 3 : 1;

    // Visualization Results
    instructionText += `
      ${guidelineNumber++}.  **Handling Visualization/Execution Results:** If a function call results in a visualization being shown by the application, acknowledge it. If a function returns data directly, summarize the key findings for the user.`;

    // Elastic Stack Questions
    instructionText += `
      ${guidelineNumber++}.  **Elastic Stack Questions:** For general questions about Elastic Stack products or features, ideally use a dedicated documentation retrieval function if available. If not, answer based on your knowledge but state that the official Elastic documentation is the definitive source.`;

    // Summarization
    if (isKnowledgeBaseReady && availableFunctionNames.includes('summarize')) {
      instructionText += `
      ${guidelineNumber++}.  **Summarization:** Use the 'summarize' function **only** when explicitly asked by the user to store information. Summaries **MUST** be in English.`;
    }

    // Context Retrieval
    if (availableFunctionNames.includes('context')) {
      instructionText += `
        ${guidelineNumber++}.  **Context Retrieval:** Use the 'context' function proactively (see Time Range Handling) or when needed to understand the user's environment or retrieve prior knowledge.`;
    }

    // Alerts
    if (
      availableFunctionNames.includes('get_alerts_dataset_info') &&
      availableFunctionNames.includes('alerts')
    ) {
      instructionText += `
        ${guidelineNumber++}.  **Alerts:** Use 'get_alerts_dataset_info' first if needed to find fields, then 'alerts' (using general time range handling) to fetch details.`;
    }

    // Raw ES API
    if (availableFunctionNames.includes('elasticsearch')) {
      instructionText += `
        ${guidelineNumber++}.  **Raw Elasticsearch API:** Use the 'elasticsearch' function *only* for advanced use cases not covered by other functions. Be cautious.`;
    }

    // APM Dependencies
    if (availableFunctionNames.includes('get_apm_downstream_dependencies')) {
      instructionText += `
        ${guidelineNumber++}.  **APM Dependencies:** Use 'get_apm_downstream_dependencies'. Extract the 'service.name' correctly from the user query. **Important Exception:** Unlike other functions where you might use defaults or context for time ranges, for 'get_apm_downstream_dependencies', if the user does not explicitly provide a time range in their request, you **MUST** ask them for the desired start and end times before calling the function. Do not rely on the 'context' function or default time ranges ('now-15m' to 'now') for this specific function unless the user provides the time range.`;
    }

    // User Interaction section
    instructionText += ` ## User Interaction
      1.  **Language Settings:** If the user asks how to change the language, explain that it's done in the AI Assistant settings within Stack Management, replying in the *same language* the user asked in.`;

    return instructionText;
  });

  //   if (isObservabilityDeployment || isGenericDeployment) {
  //     functions.registerInstruction(`
  // ${
  //   isObservabilityDeployment
  //     ? `You are a helpful assistant for Elastic Observability. Your goal is to help the Elastic Observability users to quickly assess what is happening in their observed systems. You can help them visualise and analyze data, investigate their systems, perform root cause analysis or identify optimisation opportunities.`
  //     : `You are a helpful assistant for Elasticsearch. Your goal is to help Elasticsearch users accomplish tasks using Kibana and Elasticsearch. You can help them construct queries, index data, search data, use Elasticsearch APIs, generate sample data, visualise and analyze data.`
  // }
  //       It's very important to not assume what the user means. Ask them for clarification if needed.

  //       If you are unsure about which function should be used and with what arguments, ask the user for clarification or confirmation.

  //       In KQL ("kqlFilter")) escaping happens with double quotes, not single quotes. Some characters that need escaping are: ':()\\\
  //       /\". Always put a field value in double quotes. Best: service.name:\"opbeans-go\". Wrong: service.name:opbeans-go. This is very important!

  //       You can use Github-flavored Markdown in your responses. If a function returns an array, consider using a Markdown table to format the response.

  //       ${
  //         isObservabilityDeployment
  //           ? 'Note that ES|QL (the Elasticsearch Query Language which is a new piped language) is the preferred query language.'
  //           : ''
  //       }

  //       If you want to call a function or tool, only call it a single time per message. Wait until the function has been executed and its results
  //       returned to you, before executing the same tool or another tool again if needed.

  //       ${
  //         isObservabilityDeployment
  //           ? 'DO NOT UNDER ANY CIRCUMSTANCES USE ES|QL syntax (`service.name == "foo"`) with "kqlFilter" (`service.name:"foo"`).'
  //           : ''
  //       }

  //       The user is able to change the language which they want you to reply in on the settings page of the AI Assistant for Observability and Search, which can be found in the ${
  //         isServerless ? `Project settings.` : `Stack Management app under the option AI Assistants`
  //       }.
  //       If the user asks how to change the language, reply in the same language the user asked in.`);
  //   }

  //   functions.registerInstruction(({ availableFunctionNames }) => {
  //     const instructions: string[] = [];

  //     if (
  //       availableFunctionNames.includes(QUERY_FUNCTION_NAME) &&
  //       availableFunctionNames.includes(GET_DATASET_INFO_FUNCTION_NAME)
  //     ) {
  //       instructions.push(`You MUST use the "${GET_DATASET_INFO_FUNCTION_NAME}" ${
  //         functions.hasFunction('get_apm_dataset_info') ? 'or the get_apm_dataset_info' : ''
  //       } function before calling the "${QUERY_FUNCTION_NAME}" or the "changes" functions.

  //       If a function requires an index, you MUST use the results from the dataset info functions.`);
  //     }

  //     if (availableFunctionNames.includes(GET_DATA_ON_SCREEN_FUNCTION_NAME)) {
  //       instructions.push(`You have access to data on the screen by calling the "${GET_DATA_ON_SCREEN_FUNCTION_NAME}" function.
  //         Use it to help the user understand what they are looking at. A short summary of what they are looking at is available in the return of the "${CONTEXT_FUNCTION_NAME}" function.
  //         Data that is compact enough automatically gets included in the response for the "${CONTEXT_FUNCTION_NAME}" function.`);
  //     }

  //     if (isKnowledgeBaseReady) {
  //       if (availableFunctionNames.includes(SUMMARIZE_FUNCTION_NAME)) {
  //         instructions.push(`You can use the "${SUMMARIZE_FUNCTION_NAME}" function to store new information you have learned in a knowledge database.
  //           If the user asks to remember or store some information, always use this function.
  //           All summaries MUST be created in English, even if the conversation was carried out in a different language.`);
  //       }

  //       if (availableFunctionNames.includes(CONTEXT_FUNCTION_NAME)) {
  //         instructions.push(
  //           `You can use the "${CONTEXT_FUNCTION_NAME}" function to retrieve relevant information from the knowledge database. The response will include a "learnings" field containing information
  //           from the knowledge base that is most relevant to the user's current query. You should incorporate these learnings into your responses when answering the user's questions.
  //           The information in the "learnings" field contains up-to-date information that you should consider when formulating your responses. DO NOT add disclaimers about the currency or certainty of this information.
  //           Present this information directly without qualifiers like "I don't have specific, up-to-date information" or "I can't be completely certain".

  //           Stick strictly to the information provided in the "learnings" field. DO NOT assume, infer, or add any details that are not explicitly stated in the response.
  //           If the user asks for information that is not covered in the "learnings" field, acknowledge the gap and ask for clarification rather than making assumptions or offering suggestions that aren't based on the provided knowledge.`
  //         );
  //       }
  //     } else {
  //       instructions.push(
  //         `You do not have a working memory. If the user expects you to remember the previous conversations, tell them they can set up the knowledge base.`
  //       );
  //     }
  //     return instructions.map((instruction) => dedent(instruction));
  //   });

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
