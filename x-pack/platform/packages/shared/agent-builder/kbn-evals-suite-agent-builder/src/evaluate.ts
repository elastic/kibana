/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { AgentBuilderEvaluationChatClient } from './chat_client';
import { AgentBuilderSkillClient } from './skill_client';

export const evaluate = base.extend<
  {},
  {
    chatClient: AgentBuilderEvaluationChatClient;
    skillClient: AgentBuilderSkillClient;
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
  skillClient: [
    async ({ fetch, log }, use) => {
      const skillClient = new AgentBuilderSkillClient(fetch, log);
      await use(skillClient);
    },
    {
      scope: 'worker',
    },
  ],
});
