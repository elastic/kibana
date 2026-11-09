/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { EsqlResponse } from '../utils/esql';
import {
  createUserMessage,
  createAIMessage,
  createToolResultMessage,
  createToolCallMessage,
  generateFakeToolCallId,
} from '../../langchain/messages';

export interface RequestDocumentationAction {
  type: 'request_documentation';
  requestedKeywords: string[];
  fetchedDoc: Record<string, string>;
  /** Exact messages sent to the model; only populated under full tracing. */
  prompt?: unknown;
}

export interface GenerateQueryAction {
  type: 'generate_query';
  success: boolean;
  query?: string;
  response: string;
  /**
   * Set when the model refused to answer (the provider ended the response with a content
   * filter) instead of writing a query. The same prompt will be refused again, so this ends
   * generation rather than spending the retries on it.
   */
  refusal?: string;
  /** Token spend of the generation call, when the provider reported it. */
  usage?: { inputTokens: number; outputTokens: number };
  /** Exact messages sent to the model; only populated under full tracing. */
  prompt?: unknown;
}

export interface AutocorrectQueryAction {
  type: 'autocorrect_query';
  wasCorrected: boolean;
  input: string;
  output: string;
}

export interface ExecuteQueryAction {
  type: 'execute_query';
  query: string;
  success: boolean;
  results?: EsqlResponse;
  error?: string;
  timedOut?: boolean;
}

export interface ValidateQueryAction {
  type: 'validate_query';
  query: string;
  success: boolean;
  error?: string;
}

export type Action =
  | RequestDocumentationAction
  | GenerateQueryAction
  | AutocorrectQueryAction
  | ExecuteQueryAction
  | ValidateQueryAction;

export function isRequestDocumentationAction(action: Action): action is RequestDocumentationAction {
  return action.type === 'request_documentation';
}

export function isGenerateQueryAction(action: Action): action is GenerateQueryAction {
  return action.type === 'generate_query';
}

export function isAutocorrectQueryAction(action: Action): action is AutocorrectQueryAction {
  return action.type === 'autocorrect_query';
}

export function isExecuteQueryAction(action: Action): action is ExecuteQueryAction {
  return action.type === 'execute_query';
}

export function isValidateQueryAction(action: Action): action is ValidateQueryAction {
  return action.type === 'validate_query';
}

/**
 * Format an action into a couple of [ai, user] messages to be used in prompts.
 */
export const formatAction = (action: Action, withoutToolCalls = true): BaseMessageLike[] => {
  // Important notice: models will happily call tools that are not available, just based on
  // previous tool calls, which means we can't represent the action history as a tool call list
  // and are forced to simulate a conversation instead.
  // yes, this is sub-optimal, but this is how models behave.

  const toolCallId = generateFakeToolCallId();
  switch (action.type) {
    case 'generate_query':
      return [
        createAIMessage(action.response),
        createUserMessage(
          action.success
            ? `Thank you`
            : `I don't see any query in your response, can you please try again? Don't forget to wrap your query with \`\`\`esql[query]\`\`\``
        ),
      ];
    case 'autocorrect_query':
      if (!action.wasCorrected) {
        return [];
      }
      return withoutToolCalls
        ? [
            createAIMessage('Now you can execute the query'),
            createUserMessage(
              `I ran the query through autocorrect and the corrected query was:

 \`\`\`esql
 "${action.output}"
 \`\`\``
            ),
          ]
        : [
            createToolCallMessage({
              toolCallId,
              toolName: 'correct_query',
              args: { query: action.input },
            }),
            createToolResultMessage({
              toolCallId,
              content: {
                hasMistakes: action.wasCorrected,
                output: action.output,
              },
              wrapToolResult: false,
            }),
          ];
    case 'execute_query':
      if (action.success) {
        return [];
      }
      return withoutToolCalls
        ? [
            createAIMessage('Now you can execute the query'),
            createUserMessage(
              action.timedOut
                ? formatTimedOutExecution(action)
                : `I tried executing the query and got the following error:

\`\`\`
${action.error}
\`\`\`

Can you fix the query?`
            ),
          ]
        : [
            createToolCallMessage({
              toolCallId,
              toolName: 'execute_query',
              args: { query: action.query },
            }),
            createToolResultMessage({
              toolCallId,
              content: {
                success: action.success,
                error: action.error,
                ...(action.timedOut ? { timedOut: true } : {}),
              },
              wrapToolResult: false,
            }),
          ];
    case 'validate_query':
      if (action.success) {
        return [];
      }
      return withoutToolCalls
        ? [
            createAIMessage('Now you can validate the query'),
            createUserMessage(
              `I tried validating the query and got the following error:

\`\`\`
${action.error}
\`\`\`

Can you fix the query?`
            ),
          ]
        : [
            createToolCallMessage({
              toolCallId,
              toolName: 'validate_query',
              args: { query: action.query },
            }),
            createToolResultMessage({
              toolCallId,
              content: {
                success: action.success,
                error: action.error,
              },
              wrapToolResult: false,
            }),
          ];
    case 'request_documentation': {
      const documentedKeywords = Object.keys(action.fetchedDoc);
      if (documentedKeywords.length === 0) {
        return [];
      }
      // Used to be replayed as a tool call, back when the generation step still exposed this tool.
      // It no longer does, and a tool call for an unavailable tool makes models call it anyway and
      // triggers `doNotCallThisTool` injection, so simulate a conversation like the other actions.
      const requestedKeywords =
        action.requestedKeywords.length > 0 ? action.requestedKeywords : documentedKeywords;
      return withoutToolCalls
        ? [
            createAIMessage(
              `I need the ES|QL documentation for the following keywords: ${requestedKeywords.join(
                ', '
              )}`
            ),
            createUserMessage(
              `Here is the documentation you requested:\n\n${JSON.stringify({
                documentation: action.fetchedDoc,
              })}`
            ),
          ]
        : [
            createToolCallMessage({
              toolCallId,
              toolName: 'request_documentation',
              args: { keywords: action.requestedKeywords },
            }),
            createToolResultMessage({
              toolCallId,
              content: {
                documentation: action.fetchedDoc,
              },
              wrapToolResult: false,
            }),
          ];
    }
  }
};

/**
 * A timed-out query is not broken, it is too expensive: "fix the query" would get the same query
 * back. Ask for a cheaper one instead, naming what actually narrows an ES|QL scan.
 */
const formatTimedOutExecution = (action: ExecuteQueryAction): string =>
  `I tried executing the query and it timed out:

\`\`\`
${action.error}
\`\`\`

The query is valid but too expensive to run as written, so do not resubmit it unchanged or with cosmetic changes. Write a cheaper query:
- restrict the time range on the timestamp field as described in the instructions, if the query does not already,
- filter as early as possible on selective, indexed fields,
- avoid matching on metadata fields such as \`_id\` without another selective condition,
- keep only the fields that are needed and use a small LIMIT.

If the request cannot be made cheaper, write the most selective query that still answers it.`;
