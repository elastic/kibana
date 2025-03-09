/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findLast, pick } from 'lodash';
import { BoundInferenceClient } from '@kbn/inference-plugin/server';
import { Message, MessageRole } from '../../common';
import { KnowledgeBaseQueryContainer } from '../service/knowledge_base_service';

export async function rewriteQuery({
  inferenceClient,
  messages,
  systemMessage,
  context,
}: {
  inferenceClient: BoundInferenceClient;
  messages: Message[];
  systemMessage?: string;
  context: string;
}): Promise<{
  queries: KnowledgeBaseQueryContainer[];
}> {
  const lastUserMessage = serialize(
    findLast(
      messages,
      (message) => message.message.role === MessageRole.User && !!message.message.name
    )
  );

  function serialize(message?: Message) {
    return message
      ? JSON.stringify(pick(message.message, 'content', 'name', 'function_call', 'role'))
      : '';
  }

  const serializedConversation = messages.map((message) => {
    return JSON.stringify(pick(message.message, 'content', 'name', 'function_call', 'role'));
  });

  const parts: string[] = [
    `Below is a conversation from the user. Given
      the information in the conversation, write queries that
      can be executed against the user's knowledge base.

      A semantic query is often a question, but it can be any
      text that will be used for semantic searches.

      Use keyword searches for named entities.

      You can boost a query. A higher value for \`boost\` means
      that a document that matches it will be scored higher.
      
      ### Example Prompt-to-Queries Rewrites

      **Example 1**

      User Prompt:  
      "What can you tell me about my open alerts?"

      Rewrite into Queries:  
      - Semantic: "information on open alerts"  
        Keywords: []  
        Boost: 1  

      - Semantic: "details and resolution steps for open alerts"  
        Keywords: []  
        Boost: 2  

      ---

      **Example 2**

      User Prompt:  
      "Visualize the count of my zookeeper logs over time."

      Context:  
      "A snippet in GitHub mentions 'zookeeper staging'."

      Rewrite into Queries:  
      - Semantic: "zookeeper logs count over time"  
        Keywords: ["zookeeper"]  
        Boost: 2  

      - Semantic: "zookeeper staging logs reference"  
        Keywords: ["zookeeper staging"]  
        Boost: 1  

      ---

      **Example 3**

      User Prompt:  
      "Who is on call for the PaymentService right now?"

      Context:  
      "JIRA issues sometimes refer to 'payment-service' (with a hyphen)."

      Rewrite into Queries:  
      - Semantic: "on call schedule for PaymentService"  
        Keywords: ["PaymentService", "payment-service"]  
        Boost: 2  

      - Semantic: "who is currently on call"  
        Keywords: []  
        Boost: 1  

      ---

      **Example 4**

      User Prompt:  
      "Any logs containing the IP 192.168.1.10?"

      Context:  
      "There is also a reference in Confluence to user 'alice' with that IP."

      Rewrite into Queries:  
      - Semantic: "IP 192.168.1.10 in logs"  
        Keywords: ["192.168.1.10"]  
        Boost: 2  

      - Semantic: "logs referencing user alice"  
        Keywords: ["alice"]  
        Boost: 1  

      ---

      **Example 5**

      User Prompt:  
      "Where can I find docs for ephemeral Elasticsearch cluster setup?"

      Context:  
      "Confluence references ephemeral clusters with keyword 'ephemeral-cluster'."

      Rewrite into Queries:  
      - Semantic: "ephemeral Elasticsearch cluster setup docs"  
        Keywords: ["ephemeral-cluster"]  
        Boost: 2  

      - Semantic: "documentation for ephemeral cluster configuration"  
        Keywords: []  
        Boost: 1`,
  ];

  if (lastUserMessage) {
    parts.push(`Pay special attention to the last user message.
    
    ## Last user message
    
    ${lastUserMessage}`);
  }

  parts.push(`## Conversation`);

  if (systemMessage) {
    parts.push(`### System message`);
  }

  parts.push(`### Conversation
    
  ${serializedConversation.join('\n\n')}

  ### Context

  ${context}`);

  const response = await inferenceClient.output({
    id: 'query_rewrite',
    system: `You are an expert in query rewriting. You are able
    to carefully look at the given context, and rewrite it into
    both semantic searches (for questions) and keyword searches
    (for entities).`,
    input: parts.join('\n\n'),
    schema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              keywords: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              semantic: {
                type: 'string',
              },
              boost: {
                type: 'number',
                description:
                  'The amount by which the query is boosted, defaults to 1, minimum is 1',
              },
            },
          },
        },
      },
      required: ['queries'],
    } as const,
    stream: false,
  });

  return {
    queries: response.output.queries.flatMap((query): KnowledgeBaseQueryContainer[] => {
      return [
        ...(query.keywords
          ? [
              {
                keyword: {
                  value: query.keywords,
                  boost: query.boost,
                },
              },
            ]
          : []),
        ...(query.semantic
          ? [
              {
                semantic: {
                  query: query.semantic,
                  boost: query.boost,
                },
              },
            ]
          : []),
      ];
    }),
  };
}
