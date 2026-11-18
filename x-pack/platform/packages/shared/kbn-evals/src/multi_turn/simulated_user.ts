/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole, type BoundInferenceClient, type Message } from '@kbn/inference-common';
import type { NextMessageFn } from './types';

const END_MARKER = '<END_CONVERSATION>';
const DEFAULT_MAX_SIMULATED_TURNS = 5;

const buildSystemPrompt = (instructions: string): string =>
  [
    'You are playing the user in a conversation with an AI assistant, to test the assistant. Stay in character for the whole conversation.',
    '',
    'Your persona and goal:',
    instructions,
    '',
    "Write only your next message to the assistant, as the user would type it. Don't describe yourself or the assistant, and don't add notes.",
    `When your goal is met, or the assistant can't help any further, reply with exactly ${END_MARKER}.`,
  ].join('\n');

export interface SimulatedUserOptions {
  /** Model that plays the user. Use a different model from the one under evaluation where possible. */
  inferenceClient: BoundInferenceClient;
  /** Persona and goal. Defaults to the example's `input.simulated_user.instructions`. */
  instructions?: string;
  /** Upper bound on simulated turns per conversation; `input.simulated_user.max_turns` wins. */
  maxTurns?: number;
}

/**
 * A `nextMessage` callback where a model plays the user: it reads the conversation so far and
 * writes the next message in character, or ends the conversation when its goal is met. Scripted
 * turns, if any, run first. The model never sees the example's expected output.
 */
export const createSimulatedUser = ({
  inferenceClient,
  instructions,
  maxTurns = DEFAULT_MAX_SIMULATED_TURNS,
}: SimulatedUserOptions): NextMessageFn => {
  return async ({ turns, input, conversationKey }) => {
    const persona = instructions ?? input.simulated_user?.instructions;
    if (!persona) {
      throw new Error(
        'The simulated user needs instructions, from its options or input.simulated_user.instructions'
      );
    }

    const limit = input.simulated_user?.max_turns ?? maxTurns;
    if (turns.filter(({ source }) => source === 'callback').length >= limit) {
      return undefined;
    }

    // Roles are swapped: the simulated user is the "assistant" here, answering the agent.
    const messages: Message[] = [
      { role: MessageRole.User, content: '(The assistant is waiting for your first message.)' },
      ...turns.flatMap((turn): Message[] => [
        { role: MessageRole.Assistant, content: turn.message },
        { role: MessageRole.User, content: turn.response || '(The assistant sent no reply.)' },
      ]),
    ];

    const { content } = await inferenceClient.chatComplete({
      system: buildSystemPrompt(persona),
      messages,
    });

    const message = content.trim();
    if (!message || message.includes(END_MARKER)) {
      return undefined;
    }
    return { id: `${conversationKey}-user-${turns.length + 1}`, message };
  };
};
