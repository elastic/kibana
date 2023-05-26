/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '../../assistant_context/types';
import {
  getCombinedMessage,
  getDefaultSystemPrompt,
  getSuperheroPrompt,
  getSystemMessages,
} from './helpers';
import { mockSystemPrompt } from '../../mock/system_prompt';
import { mockAlertPromptContext, mockEventPromptContext } from '../../mock/prompt_context';

describe('helpers', () => {
  describe('getSystemMessages', () => {
    it('should return an empty array if isNewChat is false', () => {
      const result = getSystemMessages({
        isNewChat: false,
        selectedSystemPrompt: mockSystemPrompt,
      });

      expect(result).toEqual([]);
    });

    it('should return an empty array if selectedSystemPrompt is undefined', () => {
      const result = getSystemMessages({ isNewChat: true, selectedSystemPrompt: undefined });

      expect(result).toEqual([]);
    });

    describe('when isNewChat is true and selectedSystemPrompt is defined', () => {
      let result: Message[];

      beforeEach(() => {
        result = getSystemMessages({ isNewChat: true, selectedSystemPrompt: mockSystemPrompt });
      });

      it('should return a message with the content of the selectedSystemPrompt', () => {
        expect(result[0].content).toBe(mockSystemPrompt.content);
      });

      it('should return a message with the role "system"', () => {
        expect(result[0].role).toBe('system');
      });

      it('should return a message with a valid timestamp', () => {
        const timestamp = new Date(result[0].timestamp);

        expect(timestamp instanceof Date && !isNaN(timestamp.valueOf())).toBe(true);
      });
    });
  });

  describe('getCombinedMessage', () => {
    const mockPromptContexts = {
      [mockAlertPromptContext.id]: mockAlertPromptContext,
      [mockEventPromptContext.id]: mockEventPromptContext,
    };

    it('returns correct content for a new chat with a system prompt', async () => {
      const message: Message = await getCombinedMessage({
        isNewChat: true,
        promptContexts: mockPromptContexts,
        promptText: 'User prompt text',
        selectedPromptContextIds: [mockAlertPromptContext.id],
        selectedSystemPrompt: mockSystemPrompt,
      });

      expect(message.content)
        .toEqual(`You are a helpful, expert assistant who answers questions about Elastic Security.

CONTEXT:
"""
alert data
"""

User prompt text`);
    });

    it('returns correct content for a new chat WITHOUT a system prompt', async () => {
      const message: Message = await getCombinedMessage({
        isNewChat: true,
        promptContexts: mockPromptContexts,
        promptText: 'User prompt text',
        selectedPromptContextIds: [mockAlertPromptContext.id],
        selectedSystemPrompt: undefined, // <-- no system prompt
      });

      expect(message.content).toEqual(`

CONTEXT:
"""
alert data
"""

User prompt text`);
    });

    it('returns the correct content for an existing chat', async () => {
      const message: Message = await getCombinedMessage({
        isNewChat: false,
        promptContexts: mockPromptContexts,
        promptText: 'User prompt text',
        selectedPromptContextIds: [mockAlertPromptContext.id],
        selectedSystemPrompt: mockSystemPrompt,
      });

      expect(message.content).toEqual(`CONTEXT:
"""
alert data
"""

CONTEXT:
"""
alert data
"""

User prompt text`);
    });

    test('getCombinedMessage returns the expected role', async () => {
      const message: Message = await getCombinedMessage({
        isNewChat: true,
        promptContexts: mockPromptContexts,
        promptText: 'User prompt text',
        selectedPromptContextIds: [mockAlertPromptContext.id],
        selectedSystemPrompt: mockSystemPrompt,
      });

      expect(message.role).toBe('user');
    });

    test('getCombinedMessage returns a valid timestamp', async () => {
      const message: Message = await getCombinedMessage({
        isNewChat: true,
        promptContexts: mockPromptContexts,
        promptText: 'User prompt text',
        selectedPromptContextIds: [mockAlertPromptContext.id],
        selectedSystemPrompt: mockSystemPrompt,
      });

      expect(Date.parse(message.timestamp)).not.toBeNaN();
    });
  });

  describe('getDefaultSystemPrompt', () => {
    it('returns the expected prompt', () => {
      const prompt = getDefaultSystemPrompt();

      expect(prompt).toEqual({
        content: `You are a helpful, expert assistant who answers questions about Elastic Security. If you don't know the answer, don't try to make one up.
Use the following context to answer questions:`,
        id: 'default-system-prompt',
        name: 'default system prompt',
        promptType: 'system',
      });
    });
  });

  describe('getSuperheroPrompt', () => {
    it('returns the expected prompt', () => {
      const prompt = getSuperheroPrompt();

      expect(prompt).toEqual({
        content: `You are a helpful, expert assistant who answers questions about Elastic Security. If you don't know the answer, don't try to make one up.
You have the personality of a mutant superhero who says \"bub\" a lot.
Use the following context to answer questions:`,
        id: 'CB9FA555-B59F-4F71-AFF9-8A891AC5BC28',
        name: 'superhero system prompt',
        promptType: 'system',
      });
    });
  });
});
