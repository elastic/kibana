/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import React, { useMemo, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChatOpenAI } from 'langchain/chat_models/openai';

import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import * as prompts from './prompt';
import { useLangchainTools } from './use_tools';

export const useLangchain = ({ data, dataViews, apiConfig, appendMessage }) => {
  // console.error('aspiCsds', apiConfig)
  const tools = useLangchainTools({ data, dataViews });

  const model = useMemo(() => {
    // Azure support
    return new ChatOpenAI({
      openAIApiKey: 'xxx,
      temperature: 0.9,
      modelName: 'gpt-4-0613',
    });
  }, []);

  const getExecutor = useCallback(() => {
    //
    return initializeAgentExecutorWithOptions(tools, model, {
      agentType: 'zero-shot-react-description',
      verbose: true,
      agentArgs: {
        prefix: prompts.ES_DSL_PREFIX,
        suffix: prompts.ES_DSL_SUFFIX,
      },
    });
  }, [model, tools]);

  return useMutation({
    mutationKey: ['useLangChain'],
    mutationFn: async (input) => {
      console.error('useMutation', input);
      const executor = await getExecutor();
      await executor.call(
        {
          top_k: 7,
          input: last(input.messages).content,
        },
        [
          {
            handleLLMEnd(output, runId) {
              appendMessage(output.generations[0][0].text);
            },
            handleLLMError(error) {
              console.error('handleLLMError', error);
              appendMessage(error.message);
            },
          },
        ]
      );
    },
  });
};
