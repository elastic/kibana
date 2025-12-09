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
      // Ensure OneChat API is enabled before running the evaluation
      const currentSettings = (await fetch('/internal/kibana/settings')) as any;
      const isOnechatEnabled =
        currentSettings?.settings?.['agentBuilder:enabled']?.userValue === true;

      if (isOnechatEnabled) {
        log.debug('Agent Builder is already enabled');
      } else {
        await fetch('/internal/kibana/settings', {
          method: 'POST',
          body: JSON.stringify({
            changes: {
              ['agentBuilder:enabled']: true,
            },
          }),
        });
        log.debug('Agent Builder enabled for the evaluation');
      }

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
