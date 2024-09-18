/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ApiConfig, PromptResponse } from '@kbn/elastic-assistant-common';
import { Conversation } from '../../assistant_context/types';
import { AIConnector } from '../../connectorland/connector_selector';
import { getGenAiConfig } from '../../connectorland/helpers';

export interface CodeBlockDetails {
  type: QueryType;
  content: string;
  start: number;
  end: number;
  getControlContainer?: () => Element | undefined;
  button?: React.ReactNode;
}

export type QueryType = 'eql' | 'esql' | 'kql' | 'dsl' | 'json' | 'no-type' | 'sql';

/**
 * `analyzeMarkdown` is a helper that enriches content returned from a query
 * with action buttons
 *
 * Returns a list of code block details for each code block in the markdown,
 * including the type of code block and the content of the code block.
 *
 * @param markdown
 */
export const analyzeMarkdown = (markdown: string): CodeBlockDetails[] => {
  const codeBlockRegex = /```(\w+)?\s([\s\S]*?)```/g;
  const matches = [...markdown.matchAll(codeBlockRegex)];
  // If your codeblocks aren't getting tagged with the right language, add keywords to the array.
  const types = {
    eql: ['Event Query Language', 'EQL sequence query', 'EQL'],
    esql: ['Elasticsearch Query Language', 'ESQL', 'ES|QL', 'SQL'],
    kql: ['Kibana Query Language', 'KQL Query', 'KQL'],
    dsl: [
      'Elasticsearch QueryDSL',
      'Elasticsearch Query DSL',
      'Elasticsearch DSL',
      'Query DSL',
      'DSL',
    ],
  };

  const result: CodeBlockDetails[] = matches.map((match) => {
    let type = match[1] || 'no-type';
    if (type === 'no-type' || type === 'json') {
      const start = match.index || 0;
      const precedingText = markdown.slice(0, start);
      for (const [typeKey, keywords] of Object.entries(types)) {
        if (keywords.some((kw) => precedingText.toLowerCase().includes(kw.toLowerCase()))) {
          type = typeKey;
          break;
        }
      }
    }

    const content = match[2].trim();
    const start = match.index || 0;
    const end = start + match[0].length;
    return { type: type as QueryType, content, start, end };
  });

  return result;
};

/**
 * Returns the new default system prompt, fallback to the default system prompt if not found
 *
 * @param allSystemPrompts All available System Prompts
 */
export const getDefaultNewSystemPrompt = (
  allSystemPrompts: PromptResponse[]
): PromptResponse | undefined => {
  return allSystemPrompts.find((prompt) => prompt.isNewConversationDefault);
};

/**
 * Returns the default system prompt for a given conversation
 *
 * @param allSystemPrompts All available System Prompts
 * @param conversation Conversation to get the default system prompt for
 */
export const getDefaultSystemPrompt = ({
  allSystemPrompts,
  conversation,
}: {
  allSystemPrompts: PromptResponse[];
  conversation: Conversation | undefined;
}): PromptResponse | undefined => {
  const conversationSystemPrompt = allSystemPrompts.find(
    (prompt) => prompt.id === conversation?.apiConfig?.defaultSystemPromptId
  );

  return conversationSystemPrompt;
};

/**
 * Returns the API config for a conversation
 *
 * @param allSystemPrompts All available System Prompts
 * @param conversation Conversation to get the API config for
 * @param connectors All available connectors
 * @param defaultConnector Default connector to use
 */
export const getConversationApiConfig = ({
  allSystemPrompts,
  conversation,
  connectors,
  defaultConnector,
}: {
  allSystemPrompts: PromptResponse[];
  conversation: Conversation;
  connectors?: AIConnector[];
  defaultConnector?: AIConnector;
}) => {
  const connector: AIConnector | undefined =
    connectors?.find((c) => c.id === conversation.apiConfig?.connectorId) ?? defaultConnector;

  const { apiProvider: connectorApiProvider, defaultModel: connectorModel } =
    getGenAiConfig(connector) ?? {};

  const defaultSystemPrompt = getDefaultSystemPrompt({
    allSystemPrompts,
    conversation,
  });

  return connector
    ? {
        apiConfig: {
          connectorId: connector.id,
          actionTypeId: connector.actionTypeId,
          provider: connector.apiProvider ?? connectorApiProvider,
          defaultSystemPromptId: defaultSystemPrompt?.id,
          model: conversation?.apiConfig?.model ?? connectorModel,
        },
      }
    : ({
        // Scenario when no connectors is configured
        apiConfig: {
          defaultSystemPromptId: defaultSystemPrompt?.id,
        },
      } as unknown as { apiConfig: ApiConfig });
};
