/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike, BaseMessage } from '@langchain/core/messages';
import {
  createUserMessage,
  createAIMessage,
  createToolResultMessage,
  createToolCallMessage,
  generateFakeToolCallId,
} from '@kbn/agent-builder-genai-utils/langchain/messages';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import type { AgentBuilderAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import type {
  AgentErrorAction,
  HandoverAction,
  ResearchAgentAction,
  AnswerAgentAction,
} from '../../actions';
import {
  isAgentErrorAction,
  isHandoverAction,
  isToolCallAction,
  isExecuteToolAction,
} from '../../actions';

export const formatResearcherActionHistory = ({
  actions,
}: {
  actions: ResearchAgentAction[];
}): BaseMessageLike[] => {
  const formatted: BaseMessageLike[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (isToolCallAction(action)) {
      // in case of forceful handover, we have a tool_call action without the corresponding tool result
      // so we want to skip it because we need a [ai, user, ai, user, ...] flow
      if (i === actions.length - 1 || !isExecuteToolAction(actions[i + 1])) {
        continue;
      }

      formatted.push(createToolCallMessage(action.tool_calls));
    }
    if (isExecuteToolAction(action)) {
      formatted.push(
        ...action.tool_results.map((result) =>
          createToolResultMessage({ content: result.content, toolCallId: result.toolCallId })
        )
      );
    }
    if (isHandoverAction(action)) {
      // returns a single [AI, user] tuple
      formatted.push(...formatHandoverAction(action));
    }
    if (isAgentErrorAction(action)) {
      // returns a single [AI, user] tuple
      formatted.push(...formatErrorAction(action));
    }
  }

  return formatted;
};

export const formatAnswerActionHistory = ({
  actions,
}: {
  actions: AnswerAgentAction[];
}): BaseMessageLike[] => {
  const formatted: BaseMessageLike[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (isAgentErrorAction(action)) {
      // returns a single [AI, user] tuple
      formatted.push(...formatErrorAction(action));
    }
    // [...] we don't need to format AnswerAction because it will terminate the execution
  }

  return formatted;
};

const formatHandoverAction = ({ message, forceful }: HandoverAction): BaseMessage[] => {
  if (forceful) {
    return [
      createAIMessage(
        cleanPrompt(
          `[researcher agent] The research process was interrupted because it exceeded the maximum allowed steps, I cannot perform any more actions.
        Handing over to the answering agent for a final answer based on the information gathered so far.`
        )
      ),
      createUserMessage(
        cleanPrompt(
          '[dispatcher] Ack. Forwarding to answering agent. Please proceed to respond without invoking any additional tools, using only the information gathered so far.'
        )
      ),
    ];
  } else {
    return [
      createAIMessage(
        cleanPrompt(
          `[researcher agent] Finished the research step. Handover notes for the answering agent:
        """
        ${message}
        """`
        )
      ),
      createUserMessage(
        cleanPrompt(
          '[dispatcher] Ack. Forwarding to answering agent. Please proceed to respond without invoking any additional tools, using only the information gathered so far.'
        )
      ),
    ];
  }
};

const formatErrorAction = ({ error }: AgentErrorAction): BaseMessage[] => {
  // tool not found -> we format that as a tool call returning an error.
  if (isExecutionError(error, AgentExecutionErrorCode.toolNotFound)) {
    const toolCallId = generateFakeToolCallId();
    const callArgs =
      typeof error.meta.toolArgs === 'string' ? { args: error.meta.toolArgs } : error.meta.toolArgs;
    return [
      createToolCallMessage({ toolCallId, toolName: error.meta.toolName, args: callArgs }),
      createToolResultMessage({
        toolCallId,
        content: `ERROR: called a tool which was not available - ${error.message}`,
      }),
    ];
  }

  // tool call validation -> we format that as a tool call returning an error.
  if (isExecutionError(error, AgentExecutionErrorCode.toolValidationError)) {
    const toolCallId = generateFakeToolCallId();
    const callArgs =
      typeof error.meta.toolArgs === 'string' ? { args: error.meta.toolArgs } : error.meta.toolArgs;
    return [
      createToolCallMessage({ toolCallId, toolName: error.meta.toolName, args: callArgs }),
      createToolResultMessage({
        toolCallId,
        content: `ERROR: called a tool which was not available - ${error.meta.validationError} ${error.message}`,
      }),
    ];
  }

  // empty response -> we format that as an empty AI message and user message asking to try again.
  if (isExecutionError(error, AgentExecutionErrorCode.emptyResponse)) {
    return [
      createAIMessage(``),
      createUserMessage('Looks like you did not provide any answer. Please try again.'),
    ];
  }

  // other error types are not recoverable -> we do not represent them.
  return [];
};

const isExecutionError = <TCode extends AgentExecutionErrorCode>(
  error: AgentBuilderAgentExecutionError,
  code: TCode
): error is AgentBuilderAgentExecutionError<TCode> => {
  return error.meta.errCode === code;
};
