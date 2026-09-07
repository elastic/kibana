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
}

export interface GenerateQueryAction {
  type: 'generate_query';
  success: boolean;
  query?: string;
  response: string;
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
  // Important notice: models are unreliable with tool configuration and will happily call tools
  // that are not available, purely based on tool calls present in the conversation history.
  // Switching the tool set between rounds is legal, but observed with both Claude and Gemini 3.5
  // Flash Lite, so we can't represent the action history as a tool call list and simulate a
  // conversation instead.
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
              `I tried executing the query and got the following error:

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
      // Simulated as a conversation like the other actions, rather than replayed as a tool call.
      //
      // The tool call form was intentional at first: the generation step still exposed
      // `request_documentation`, so the model could legitimately call it again when it needed more
      // doc, and keeping the original shape helped prompt caching. The tool was later dropped from
      // the generation step for determinism, which left the replay referencing a tool that is no
      // longer offered — so the tool call form is a leftover of that removal, not a deliberate
      // choice, and the caching argument no longer holds either since changing the tool set
      // between the two rounds already breaks the cached prefix.
      //
      // Keeping it caused two distinct failures: models complete the pattern the transcript
      // establishes and call the absent tool (`validateToolCalls` then throws, aborting generation
      // entirely rather than consuming a retry), and a tool call in the history combined with no
      // tools in the request makes `ensureToolsWhenHistoryHasToolUse` inject its
      // `doNotCallThisTool` placeholder, which models sometimes call instead. Together those were
      // 22 of 32 failed calls in a Gemini 3.5 Flash Lite eval of this tool.
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
