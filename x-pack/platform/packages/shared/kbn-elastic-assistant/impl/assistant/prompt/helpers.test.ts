/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClientMessage } from '../../assistant_context/types';
import { getCombinedMessage } from './helpers';
import { mockGetAnonymizedValue } from '../../mock/get_anonymized_value';
import { mockAlertPromptContext } from '../../mock/prompt_context';
import type { SelectedPromptContext } from '../prompt_context/types';

const mockSelectedAlertPromptContext: SelectedPromptContext = {
  contextAnonymizationFields: { total: 0, page: 1, perPage: 1000, data: [] },
  promptContextId: mockAlertPromptContext.id,
  rawData: 'alert data',
};

describe('helpers', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getCombinedMessage', () => {
    it('returns correct content for a chat', async () => {
      const message: ClientMessage = await getCombinedMessage({
        currentReplacements: {},
        promptText: 'User prompt text',
        selectedPromptContexts: {
          [mockSelectedAlertPromptContext.promptContextId]: mockSelectedAlertPromptContext,
        },
      });

      expect(message.content).toEqual(`CONTEXT:
"""
alert data
"""

User prompt text`);
    });

    it('returns the correct content for an existing chat', async () => {
      const message: ClientMessage = await getCombinedMessage({
        currentReplacements: {},
        promptText: 'User prompt text',
        selectedPromptContexts: {
          [mockSelectedAlertPromptContext.promptContextId]: mockSelectedAlertPromptContext,
        },
      });

      expect(message.content).toEqual(`CONTEXT:
"""
alert data
"""

User prompt text`);
    });

    it('returns the expected role', async () => {
      const message: ClientMessage = await getCombinedMessage({
        currentReplacements: {},
        promptText: 'User prompt text',
        selectedPromptContexts: {
          [mockSelectedAlertPromptContext.promptContextId]: mockSelectedAlertPromptContext,
        },
      });

      expect(message.role).toBe('user');
    });

    it('returns a valid timestamp', async () => {
      const message: ClientMessage = await getCombinedMessage({
        currentReplacements: {},
        promptText: 'User prompt text',
        selectedPromptContexts: {},
      });

      expect(Date.parse(message.timestamp)).not.toBeNaN();
    });
    it('should return the correct combined message for a chat without prompt context', () => {
      const result = getCombinedMessage({
        currentReplacements: {},
        promptText: 'User prompt text',
        selectedPromptContexts: {},
      });

      expect(result.content).toEqual(`User prompt text`);
    });

    it('should return the correct combined message for a chat with multiple selectedPromptContext', () => {
      const result = getCombinedMessage({
        currentReplacements: {},
        promptText: 'User prompt text',
        selectedPromptContexts: {
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
        },
      });

      expect(result.content).toEqual(
        `CONTEXT:\n\"\"\"\nThis is raw data for context 1\n\"\"\"\n,CONTEXT:\n\"\"\"\nThis is raw data for context 2\n\"\"\"\n\nUser prompt text`
      );
    });

    it('should remove extra spaces when there is no prompt content or system prompt', () => {
      const result = getCombinedMessage({
        currentReplacements: {},
        promptText: 'User prompt text',
        selectedPromptContexts: {},
      });

      expect(result.content).toEqual(`User prompt text`);
    });

    describe('when there is data to anonymize', () => {
      const mockPromptContextWithDataToAnonymize: SelectedPromptContext = {
        contextAnonymizationFields: {
          total: 0,
          page: 1,
          perPage: 1000,
          data: [
            {
              id: 'field1',
              field: 'field1',
              anonymized: true,
              allowed: true,
            },
            {
              id: 'field2',
              field: 'field2',
              anonymized: true,
              allowed: true,
            },
          ],
        },
        promptContextId: 'test-prompt-context-id',
        rawData: {
          field1: ['foo', 'bar', 'baz'],
          field2: ['foozle'],
        },
      };

      it('invokes `onNewReplacements` with the expected replacements', async () => {
        const message = await getCombinedMessage({
          currentReplacements: {},
          getAnonymizedValue: mockGetAnonymizedValue,
          promptText: 'User prompt text',
          selectedPromptContexts: {
            [mockPromptContextWithDataToAnonymize.promptContextId]:
              mockPromptContextWithDataToAnonymize,
          },
        });

        expect(message.replacements).toEqual({
          elzoof: 'foozle',
          oof: 'foo',
          rab: 'bar',
          zab: 'baz',
        });
      });

      it('returns the expected content when `isNewChat` is false', async () => {
        const message: ClientMessage = await getCombinedMessage({
          currentReplacements: {},
          getAnonymizedValue: mockGetAnonymizedValue,
          promptText: 'User prompt text',
          selectedPromptContexts: {},
        });

        expect(message.content).toEqual(`User prompt text`);
      });
    });
  });
});
