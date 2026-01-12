/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { AgentBuilderEvaluationChatClient } from './chat_client';
export const evaluate = base.extend<
  {},
  {
    chatClient: AgentBuilderEvaluationChatClient;
    agentBuilderSetup: void;
  }
>({
  agentBuilderSetup: [
    async ({ uiSettings, log }, use) => {
      // Ensure AgentBuilder API is enabled before running the evaluation.
      // Using Scout's uiSettings fixture is more robust than calling /internal/kibana/settings directly.
      await uiSettings.set({ ['agentBuilder:enabled']: true });
      log.debug('Agent Builder enabled for the evaluation');
      await use();
    },
    {
      scope: 'worker',
      auto: true, // This ensures it runs automatically
    },
  ],
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
