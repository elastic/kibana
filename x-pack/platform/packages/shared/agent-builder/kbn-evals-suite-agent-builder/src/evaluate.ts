/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as evalsBase } from '@kbn/evals';
import { withPhoenixExecutor } from '@kbn/evals-phoenix-executor';
import { AgentBuilderEvaluationChatClient } from './chat_client';

const base = withPhoenixExecutor(evalsBase);

export const evaluate = base.extend<
  {},
  {
    chatClient: AgentBuilderEvaluationChatClient;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      const chatClient = new AgentBuilderEvaluationChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
});
