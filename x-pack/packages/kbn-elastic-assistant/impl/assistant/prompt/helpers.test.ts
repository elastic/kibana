/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '../../assistant_context/types';
import { getCombinedMessage, getSystemMessages } from './helpers';
import { mockGetAnonymizedValue } from '../../mock/get_anonymized_value';
import { mockSystemPrompt } from '../../mock/system_prompt';
import { mockAlertPromptContext } from '../../mock/prompt_context';
import type { SelectedPromptContext } from '../prompt_context/types';

const mockSelectedAlertPromptContext: SelectedPromptContext = {
  allow: [],
  allowReplacement: [],
  promptContextId: mockAlertPromptContext.id,
  rawData: 'alert data',
};

describe('helpers', () => {
  beforeEach(() => jest.clearAllMocks());

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
    it('returns correct content for a new chat with a system prompt', async () => {
      const message: Message = await getCombinedMessage({
        currentReplacements: [],
        isNewChat: true,
        promptText: 'User prompt text',
        selectedPromptContexts: {
          [mockSelectedAlertPromptContext.promptContextId]: mockSelectedAlertPromptContext,
        },
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
        currentReplacements: [],
        isNewChat: true,
        promptText: 'User prompt text',
        selectedPromptContexts: {
          [mockSelectedAlertPromptContext.promptContextId]: mockSelectedAlertPromptContext,
        },
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
        currentReplacements: [],
        isNewChat: false,
        promptText: 'User prompt text',
        selectedPromptContexts: {
          [mockSelectedAlertPromptContext.promptContextId]: mockSelectedAlertPromptContext,
        },
        selectedSystemPrompt: mockSystemPrompt,
      });

      expect(message.content).toEqual(`CONTEXT:
"""
alert data
"""

User prompt text`);
    });

    it('returns the expected role', async () => {
      const message: Message = await getCombinedMessage({
        currentReplacements: [],
        isNewChat: true,
        promptText: 'User prompt text',
        selectedPromptContexts: {
          [mockSelectedAlertPromptContext.promptContextId]: mockSelectedAlertPromptContext,
        },
        selectedSystemPrompt: mockSystemPrompt,
      });

      expect(message.role).toBe('user');
    });

    it('returns a valid timestamp', async () => {
      const message: Message = await getCombinedMessage({
        currentReplacements: [],
        isNewChat: true,
        promptText: 'User prompt text',
        selectedPromptContexts: {},
        selectedSystemPrompt: mockSystemPrompt,
      });

      expect(Date.parse(message.timestamp)).not.toBeNaN();
    });

    describe('when there is data to anonymize', () => {
      const mockPromptContextWithDataToAnonymize: SelectedPromptContext = {
        allow: ['field1', 'field2'],
        allowReplacement: ['field1', 'field2'],
        promptContextId: 'test-prompt-context-id',
        rawData: {
          field1: ['foo', 'bar', 'baz'],
          field2: ['foozle'],
        },
      };

      it('invokes `onNewReplacements` with the expected replacements', async () => {
        const message = await getCombinedMessage({
          currentReplacements: [],
          getAnonymizedValue: mockGetAnonymizedValue,
          isNewChat: true,
          promptText: 'User prompt text',
          selectedPromptContexts: {
            [mockPromptContextWithDataToAnonymize.promptContextId]:
              mockPromptContextWithDataToAnonymize,
          },
          selectedSystemPrompt: mockSystemPrompt,
        });

        expect(message.replacements).toEqual([
          { uuid: 'oof', value: 'foo' },
          { uuid: 'rab', value: 'bar' },
          { uuid: 'zab', value: 'baz' },
          { uuid: 'elzoof', value: 'foozle' },
        ]);
      });

      it('returns the expected content when `isNewChat` is false', async () => {
        const isNewChat = false; // <-- not a new chat

        const message: Message = await getCombinedMessage({
          currentReplacements: [],
          getAnonymizedValue: mockGetAnonymizedValue,
          isNewChat,
          promptText: 'User prompt text',
          selectedPromptContexts: {},
          selectedSystemPrompt: mockSystemPrompt,
        });

        expect(message.content).toEqual(`

User prompt text`);
      });
    });
  });
});
