/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import {
  createUserMessage,
  createAIMessage,
  createToolResultMessage,
  createToolCallMessage,
} from '@kbn/onechat-genai-utils/langchain/messages';
import type { ResearchAgentAction } from '../actions';
import {
  isAgentErrorAction,
  isHandoverAction,
  isToolCallAction,
  isExecuteToolAction,
} from '../actions';

export const formatActions = ({
  actions,
}: {
  actions: ResearchAgentAction[];
}): BaseMessageLike[] => {
  const formatted: BaseMessageLike[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (isToolCallAction(action)) {
      formatted.push(createToolCallMessage(action.tool_calls));
    } else if (isExecuteToolAction(action)) {
      formatted.push(
        ...action.tool_results.map((result) =>
          createToolResultMessage({ content: result.content, toolCallId: result.toolCallId })
        )
      );
    } else if (isHandoverAction(action)) {
      formatted.push(
        createAIMessage(
          `[researcher agent] Finished the research step. Handover for the answering agent: "${action.message}"`
        ),
        createUserMessage(
          'Ack. forwarding to answering agent. Proceed to answer as best as you can with the collected information'
        )
      );
      // TODO
    } else if (isAgentErrorAction(action)) {
      // TODO: if action is recoverable, add a message
    } else {
      // TODO
    }
  }

  return formatted;
};
