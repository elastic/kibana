/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DefaultLLMConnector {
  id: string;
  name: string;
  actionTypeId: string;
  config: {
    provider: string;
    taskType: string;
    inferenceId: string;
    providerConfig: {
      model_id: string;
    };
  };
}

export const defaultLLMConnectors: DefaultLLMConnector[] = [
  {
    id: 'cdb28662-0d9c-4c4d-904a-26d7927bf23b',
    name: 'Anthropic Claude Sonnet 3.7',
    actionTypeId: '.inference',
    config: {
      provider: 'elastic',
      taskType: 'chat_completion',
      inferenceId: 'rainbow-sprinkles-elastic',
      providerConfig: {
        model_id: 'rainbow-sprinkles',
      },
    },
  },
  {
    id: '921257e8-8037-48fc-beee-be1c7e6d23d3',
    name: 'Anthropic Claude Sonnet 4.5',
    actionTypeId: '.inference',
    config: {
      provider: 'elastic',
      taskType: 'chat_completion',
      inferenceId: 'gp-llm-v2-chat_completion',
      providerConfig: {
        model_id: 'gp-llm-v2',
      },
    },
  },
];
