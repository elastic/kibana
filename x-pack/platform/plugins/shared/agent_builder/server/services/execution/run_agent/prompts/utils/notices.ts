/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import {
  createUserMessage,
  createAIMessage,
  createToolResultMessage,
  createToolCallMessage,
  generateFakeToolCallId,
} from '@kbn/agent-builder-genai-utils/langchain/messages';
import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import type {
  ExecutionAbortReason,
  ExecutionInterruption,
  SerializedExecutionError,
} from '@kbn/agent-builder-common';
import { generateXmlTree } from '@kbn/agent-builder-genai-utils/tools/utils/formatting';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import type { AgentBuilderAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import type { BackgroundExecutionState, SubagentRosterEntry } from '@kbn/agent-builder-common/chat';
import type { HandoverParams } from '../types';

/** Number of most recent research cycles whose tool results are never compacted in-flight. */
export const PRESERVED_RECENT_CYCLES = 2;

export const IN_FLIGHT_TOKEN_THRESHOLD = 50_000;

export const createCycleLimitSystemMessage = (cycle: number): BaseMessage => {
  return createUserMessage(`<system-notice>
You action budget is almost expired for that round. You only have ${cycle} cycles (tool calls) left before the execution will be terminated.
Finish what you are doing in that budget and proceed to respond to the user before reaching the end of the cycles.
Interrupt your current action if necessary to make sure you finish before termination.
</system-notice>`);
};

/** Renders the research → answer handover exchange. */
export const formatHandover = ({ message, forceful }: HandoverParams): BaseMessage[] => {
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

/** Renders a recoverable model error as the assistant/user exchange the model sees on its next turn. */
export const formatRetryNotice = (error: AgentBuilderAgentExecutionError): BaseMessage[] => {
  // tool not found -> we format that as a tool call returning an error.
  if (isExecutionError(error, AgentExecutionErrorCode.toolNotFound)) {
    const toolCallId = generateFakeToolCallId();
    const callArgs =
      typeof error.meta.toolArgs === 'string' ? { args: error.meta.toolArgs } : error.meta.toolArgs;
    return [
      createToolCallMessage({ toolCallId, toolName: error.meta.toolName, args: callArgs }),
      createToolResultMessage({
        toolCallId,
        content: `ERROR: tool_not_found - called a tool which was not available: ${error.message}`,
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
        content: `ERROR: tool_validation_error - called a tool with invalid parameters - ${error.meta.validationError} ${error.message}`,
      }),
    ];
  }

  // empty response -> placeholder AI turn + user nudge to retry.
  // Use non-empty assistant text: Anthropic rejects empty content blocks, and dropping the
  // turn collapses consecutive user messages (endless empty-response retries).
  if (isExecutionError(error, AgentExecutionErrorCode.emptyResponse)) {
    return [
      createAIMessage('...'),
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

/** Upper bound on the error message rendered in a failed-execution notice. */
export const EXECUTION_FAILED_NOTICE_MAX_LENGTH = 500;

/**
 * System notice telling the model that a previous attempt to answer failed and produced no
 * response; the steps rendered before it were completed and are kept. The error text is untrusted
 * (it may echo tool or model output): it is XML-escaped by `generateXmlTree` and bounded to
 * {@link EXECUTION_FAILED_NOTICE_MAX_LENGTH}.
 */
export const formatExecutionFailedNotice = (error: SerializedExecutionError): string => {
  const bounded = (text: string) =>
    text.length > EXECUTION_FAILED_NOTICE_MAX_LENGTH
      ? `${text.slice(0, EXECUTION_FAILED_NOTICE_MAX_LENGTH)}…`
      : text;
  // The cause chain (outermost first) is what usually says why the run failed; the wrapper's
  // message alone ("Error executing agent: …") rarely does.
  const causes = (error.causes ?? []).map((cause) => ({
    tagName: 'cause',
    ...(cause.code ? { attributes: { code: cause.code } } : {}),
    children: [bounded(cause.message)],
  }));
  return generateXmlTree({
    tagName: 'system_notice',
    children: [
      {
        tagName: 'message',
        children: [
          "The agent's attempt to answer the previous message failed. The steps above were completed; no response was produced.",
        ],
      },
      {
        tagName: 'error',
        attributes: { code: error.code },
        children: [bounded(error.message), ...causes],
      },
    ],
  });
};

/**
 * System notice for a run that was cancelled. Neutral wording: `aborted_by.source` may be a user
 * (`api`), a timeout / shutdown (`task_manager`) or a parent execution (`caller`).
 */
export const formatExecutionAbortedNotice = (abortedBy?: ExecutionAbortReason): string =>
  generateXmlTree({
    tagName: 'system_notice',
    children: [
      {
        tagName: 'message',
        children: [
          'The previous execution was interrupted before the agent finished. The steps above were completed; no response was produced.',
        ],
      },
      ...(abortedBy ? [{ tagName: 'interruption', attributes: { source: abortedBy.source } }] : []),
    ],
  });

/** The notice that stands in for the assistant answer of an interrupted round. */
export const formatInterruptionNotice = (interruption: ExecutionInterruption): string =>
  interruption.type === 'failed'
    ? formatExecutionFailedNotice(interruption.error)
    : formatExecutionAbortedNotice(interruption.aborted_by);

export const formatSystemNotice = (execution: BackgroundExecutionState): string => {
  const { status, execution_id: executionId } = execution;

  const outcome = execution.error
    ? {
        message: 'A background agent execution has failed.',
        detail: { tagName: 'error', children: [execution.error.message] },
      }
    : {
        message: 'A background agent execution has completed.',
        detail: { tagName: 'result', children: [execution.response?.message ?? 'No response'] },
      };

  return generateXmlTree({
    tagName: 'system_notice',
    children: [
      { tagName: 'message', children: [outcome.message] },
      { tagName: 'execution-id', children: [executionId] },
      { tagName: 'status', children: [status] },
      outcome.detail,
    ],
  });
};

/**
 * Render the active persistent sub-agent roster as a system notice.
 */
export const formatSubagentRosterNotice = (roster: SubagentRosterEntry[]): string => {
  const lines = roster.map((entry) =>
    entry.purpose ? `- ${entry.name}: ${entry.purpose}` : `- ${entry.name}`
  );
  return `<system-notice>
Active persistent sub-agents (interact via send_message):
${lines.join('\n')}
</system-notice>`;
};
