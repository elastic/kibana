/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import dedent from 'dedent';
import { ObservabilityAIAssistantScreenContextRequest } from '../../common/types';
import { FunctionVisibility } from '../../common';
import { ChatFunctionClient } from '../service/chat_function_client';

export const GET_DATA_ON_SCREEN_FUNCTION_NAME = 'get_data_on_screen';

export function registerGetDataOnScreenFunction(
  functions: ChatFunctionClient,
  screenContexts: ObservabilityAIAssistantScreenContextRequest[]
) {
  const allData = compact(screenContexts.flatMap((context) => context.data));

  if (!allData.length) {
    return;
  }

  functions.registerFunction(
    {
      name: GET_DATA_ON_SCREEN_FUNCTION_NAME,
      description: `Retrieve the structured data of content currently visible on the user's screen. Use this tool to understand what the user is viewing at this moment to provide more accurate and context-aware responses to their questions.`,
      visibility: FunctionVisibility.All,
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            description:
              'The pieces of data you want to look at it. You can request one, or multiple',
            items: {
              type: 'string',
              enum: allData.map((data) => data.name),
            },
          },
        },
        required: ['data' as const],
      },
    },
    async ({ arguments: { data: dataNames } }) => {
      return {
        content: allData.filter((data) => dataNames.includes(data.name)),
      };
    }
  );

  functions.registerInstruction(({ availableFunctionNames }) =>
    availableFunctionNames.includes(GET_DATA_ON_SCREEN_FUNCTION_NAME)
      ? `The ${GET_DATA_ON_SCREEN_FUNCTION_NAME} function will retrieve specific content from the user's screen by specifying a data key. Use this tool to provide context-aware responses. Available data: ${dedent(
          allData.map((data) => `${data.name}: ${data.description}`).join('\n')
        )}`
      : undefined
  );
}
