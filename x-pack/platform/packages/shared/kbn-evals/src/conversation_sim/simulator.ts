/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvaluationDataset, Example } from '../types';
import type { UserPersona } from './personas';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface SimulatorConfig {
  /** Number of conversations to generate */
  conversationCount: number;
  /** Number of turns per conversation (each turn = 1 user + 1 assistant message) */
  turnsPerConversation: number;
  /** Topic or scenario for the conversations */
  topic: string;
}

const buildSystemPrompt = (persona: UserPersona, topic: string): string => {
  return `You are simulating a conversation between a user and an AI assistant.

The user has the following persona:
- Name: ${persona.name}
- Description: ${persona.description}
- Traits: ${persona.traits.join(', ')}
- Vocabulary level: ${persona.vocabulary}

The conversation topic is: ${topic}

Generate realistic conversation turns. For each turn, provide both the user message (matching the persona) and a plausible assistant response.

Return the conversation as structured output.`;
};

const conversationSchema = {
  type: 'object' as const,
  properties: {
    turns: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          role: { type: 'string' as const, enum: ['user', 'assistant'] },
          content: { type: 'string' as const },
        },
        required: ['role', 'content'] as const,
      },
    },
  },
  required: ['turns'] as const,
} as const;

/**
 * Generate synthetic multi-turn conversations using an LLM.
 *
 * Each conversation follows a persona's communication style and covers
 * the specified topic. Output is an EvaluationDataset whose examples
 * each contain a full conversation transcript in the input.
 */
export const simulateConversations = async (
  persona: UserPersona,
  inferenceClient: BoundInferenceClient,
  config: SimulatorConfig
): Promise<EvaluationDataset> => {
  const examples: Example[] = [];

  for (let i = 0; i < config.conversationCount; i++) {
    const conversation = await generateSingleConversation(
      persona,
      inferenceClient,
      config.topic,
      config.turnsPerConversation
    );

    const transcript = conversation
      .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
      .join('\n');

    examples.push({
      input: {
        conversation: transcript,
        persona: persona.name,
        topic: config.topic,
        turns: conversation,
      },
      metadata: {
        persona: persona.name,
        turn_count: conversation.length,
        generated: true,
      },
    });
  }

  return {
    name: `simulated-${persona.name}-${config.topic.replace(/\s+/g, '-').toLowerCase()}`,
    description: `Simulated ${config.conversationCount} conversations with ${persona.name} persona on "${config.topic}"`,
    examples,
  };
};

const generateSingleConversation = async (
  persona: UserPersona,
  inferenceClient: BoundInferenceClient,
  topic: string,
  turnsPerConversation: number
): Promise<ConversationTurn[]> => {
  const response = await inferenceClient.output({
    id: 'conversation_sim',
    system: buildSystemPrompt(persona, topic),
    input: `Generate a conversation with exactly ${turnsPerConversation} turns (each turn = 1 user message + 1 assistant response, so ${turnsPerConversation * 2} messages total).`,
    schema: conversationSchema,
  });

  return (response.output.turns as ConversationTurn[]) ?? [];
};
