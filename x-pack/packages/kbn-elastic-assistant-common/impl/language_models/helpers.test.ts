/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message } from '../schemas';
import { getMessageContentAndRole } from './helpers';
import { getCombinedMessage } from '@kbn/elastic-assistant/impl/assistant/prompt/helpers';
import type { SelectedPromptContext } from '@kbn/elastic-assistant/impl/assistant/prompt_context/types';
import type { Prompt } from '@kbn/elastic-assistant';

describe('helpers', () => {
  describe('getMessageContentAndRole', () => {
    const testCases: Array<[string, Pick<Message, 'content' | 'role'>]> = [
      ['Prompt 1', { content: 'Prompt 1', role: 'user' }],
      ['Prompt 2', { content: 'Prompt 2', role: 'user' }],
      ['', { content: '', role: 'user' }],
    ];

    testCases.forEach(([prompt, expectedOutput]) => {
      test(`Given the prompt "${prompt}", it returns the prompt as content with a "user" role`, () => {
        const result = getMessageContentAndRole(prompt);

        expect(result).toEqual(expectedOutput);
      });
    });
  });
  describe('getCombinedMessage', () => {
    const defaultGetAnonymizedValue = jest.fn((args) => args.rawValue);

    const mockPrompt: Prompt = {
      content: 'This is a system prompt',
      id: '123',
      name: 'prompt name',
      promptType: 'system',
    };

    const mockPromptContexts: Record<string, SelectedPromptContext> = {
      context1: {
        promptContextId: 'context1',
        rawData: 'This is raw data for context 1',
        replacements: {},
      },
      context2: {
        promptContextId: 'context2',
        rawData: 'This is raw data for context 2',
        replacements: {},
      },
    };

    const mockCurrentReplacements = {
      currentReplacement1: 'value1',
      currentReplacement2: 'value2',
    };
    const defaultProps = {
      currentReplacements: mockCurrentReplacements,
      getAnonymizedValue: defaultGetAnonymizedValue,
      isNewChat: true,
      promptText: 'This is a user prompt',
      selectedPromptContexts: mockPromptContexts,
      selectedSystemPrompt: mockPrompt,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return the correct combined message for a new chat', () => {
      const result = getCombinedMessage(defaultProps);

      expect(result.content).toEqual(
        `This is a system prompt\n\nCONTEXT:\n\"\"\"\nThis is raw data for context 1\n\"\"\"\n,CONTEXT:\n\"\"\"\nThis is raw data for context 2\n\"\"\"\n\nThis is a user prompt`
      );
    });

    it('should return the correct combined message for an existing chat', () => {
      const result = getCombinedMessage({
        ...defaultProps,
        isNewChat: false,
      });

      expect(result.content).toEqual(
        `CONTEXT:\n\"\"\"\nThis is raw data for context 1\n\"\"\"\n,CONTEXT:\n\"\"\"\nThis is raw data for context 2\n\"\"\"\n\nThis is a user prompt`
      );
    });

    it('should remove extra spaces when there is no prompt content or prompt conext', () => {
      const customGetAnonymizedValue = jest.fn((args) => `ANONYMIZED(${args.rawValue})`);

      const result = getCombinedMessage({
        ...defaultProps,
        selectedPromptContexts: {},
        selectedSystemPrompt: { ...mockPrompt, content: '' },
      });

      expect(result.content).toEqual(`This is a user prompt`);
    });
  });
});
