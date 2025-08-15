/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { OnechatEvaluationChatClient } from './chat_client';
export const evaluate = base.extend<
  {},
  {
    chatClient: OnechatEvaluationChatClient;
    onechatSetup: void;
  }
>({
  onechatSetup: [
    async ({ fetch, log }, use) => {
      // Enable OneChat API before running the evaluation
      await fetch('/internal/kibana/settings', {
        method: 'POST',
        body: JSON.stringify({
          changes: {
            'onechat:api:enabled': true,
          },
        }),
      });

      log.info('OneChat API enabled for the evaluation');

      await use();
    },
    {
      scope: 'worker',
      auto: true, // This ensures it runs automatically
    },
  ],
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      const chatClient = new OnechatEvaluationChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
});
