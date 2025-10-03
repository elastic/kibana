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

export type Action =
  | RequestDocumentationAction
  | GenerateQueryAction
  | AutocorrectQueryAction
  | ExecuteQueryAction;

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

/**
 * Format an action into a couple of [ai, user] messages to be used in prompts.
 */
export const formatAction = (action: Action): BaseMessageLike[] => {
  const toolCallId = generateFakeToolCallId();
  switch (action.type) {
    case 'generate_query':
      return [
        createAIMessage(action.response),
        createUserMessage(
          action.success
            ? `Now run it through autocorrect and then execute it`
            : `No query generated, please try again.`
        ),
      ];
    case 'autocorrect_query':
      return [
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
        }),
      ];
    case 'execute_query':
      return [
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
        }),
      ];
    case 'request_documentation':
      return [
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
        }),
      ];
  }
};
