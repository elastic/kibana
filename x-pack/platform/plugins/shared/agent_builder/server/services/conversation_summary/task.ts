/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { ConversationSummaryRunnerDeps, ConversationSummaryTaskParams } from './run_summary';
import { runConversationSummary } from './run_summary';

export const CONVERSATION_SUMMARY_TASK_TYPE = 'agent-builder:summarize-conversation';

export const registerConversationSummaryTask = ({
  taskManager,
  getRunner,
}: {
  taskManager: TaskManagerSetupContract;
  getRunner: () => ConversationSummaryRunnerDeps;
}) => {
  taskManager.registerTaskDefinitions({
    [CONVERSATION_SUMMARY_TASK_TYPE]: {
      title: 'Agent Builder: Summarize conversation',
      timeout: '10m',
      maxAttempts: 1,
      createTaskRunner: ({ taskInstance, fakeRequest }) => {
        const params = taskInstance.params as ConversationSummaryTaskParams;
        return {
          async run() {
            if (!fakeRequest) {
              throw new Error(
                'Cannot summarize a conversation without a request (missing API key)'
              );
            }
            await runConversationSummary({
              request: fakeRequest,
              task: params,
              deps: getRunner(),
            });
            return { state: {} };
          },
        };
      },
    },
  });
};
