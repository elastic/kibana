/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentSuggestionRegistry } from './suggestion_registry';
import type { SuggestionType, SuggestionHandler } from './types';
import type { SuggestionContext } from '../../common/types/domain';
import type { KibanaRequest } from '@kbn/core/server';

describe('AttachmentSuggestionRegistry', () => {
  let registry: AttachmentSuggestionRegistry;

  beforeEach(() => {
    registry = new AttachmentSuggestionRegistry();
  });

  describe('register and getAll', () => {
    it('should register a suggestion type and retrieve it', () => {
      const suggestionType: SuggestionType = {
        id: 'test-suggestion',
        owner: 'observability',
        attachmentId: 'attachment-1',
        tools: {
          testHandler: {
            description: 'Tool 1 for test suggestion',
          },
        },
        handlers: {
          testHandler: jest.fn(),
        },
      };

      registry.register(suggestionType);

      const allSuggestions = registry.getAll();
      expect(allSuggestions).toHaveLength(1);
      expect(allSuggestions[0]).toEqual(suggestionType);
    });
  });

  describe('getAllForOwners', () => {
    it('should filter suggestions by owner', () => {
      const suggestionType1: SuggestionType = {
        id: 'suggestion-1',
        attachmentId: 'attachment-1',
        owner: 'observability',
        tools: {},
        handlers: {},
      };

      const suggestionType2: SuggestionType = {
        id: 'suggestion-2',
        attachmentId: 'attachment-2',
        owner: 'security',
        tools: {},
        handlers: {},
      };

      registry.register(suggestionType1);
      registry.register(suggestionType2);

      const observabilitySuggestions = registry.getAllForOwners(['observability']);
      expect(observabilitySuggestions).toHaveLength(1);
      expect(observabilitySuggestions[0].id).toBe('suggestion-1');
    });
  });

  describe('getAllSuggestionsForOwners', () => {
    it('should execute all handlers for the specified owners and return combined suggestions', async () => {
      const mockHandler1: SuggestionHandler = jest.fn(async () => ({
        suggestions: [
          {
            id: 'suggestion-1',
            description: 'Test suggestion 1',
            data: [],
          },
        ],
      }));

      const mockHandler2: SuggestionHandler = jest.fn(async () => ({
        suggestions: [
          {
            id: 'suggestion-2',
            description: 'Test suggestion 2',
            data: [],
          },
        ],
      }));

      const suggestionType: SuggestionType = {
        id: 'test-suggestion',
        owner: 'observability',
        attachmentId: 'attachment-1',
        tools: {
          handler1: {
            description: 'Handler 1 for test suggestion',
          },
          handler2: {
            description: 'Handler 2 for test suggestion',
          },
        },
        handlers: {
          handler1: mockHandler1,
          handler2: mockHandler2,
        },
      };

      registry.register(suggestionType);

      const context: SuggestionContext = {
        'service.name': 'test-service',
        timeRange: {
          from: '2023-01-01T00:00:00Z',
          to: '2023-01-02T00:00:00Z',
        },
      };

      const request = {} as KibanaRequest;

      const response = await registry.getAllSuggestionsForOwners(
        ['observability'],
        context,
        request
      );

      expect(response.suggestions).toHaveLength(2);
      expect(response.suggestions[0].id).toBe('suggestion-1');
      expect(response.suggestions[1].id).toBe('suggestion-2');

      expect(mockHandler1).toHaveBeenCalledWith({ request, context });
      expect(mockHandler2).toHaveBeenCalledWith({ request, context });
    });

    it('should handle rejected handlers gracefully', async () => {
      const mockHandler1: SuggestionHandler = jest.fn(async () => ({
        suggestions: [
          {
            id: 'suggestion-1',
            description: 'Test suggestion 1',
            data: [],
          },
        ],
      }));

      const mockHandler2: SuggestionHandler = jest.fn(async () => {
        throw new Error('Handler failed');
      });

      const suggestionType: SuggestionType = {
        id: 'test-suggestion',
        attachmentId: 'attachment-1',
        owner: 'observability',
        tools: {
          handler1: {
            description: 'Handler 1 for test suggestion',
          },
          handler2: {
            description: 'Handler 2 for test suggestion',
          },
        },
        handlers: {
          handler1: mockHandler1,
          handler2: mockHandler2,
        },
      };

      registry.register(suggestionType);

      const context: SuggestionContext = {
        'service.name': 'test-service',
        timeRange: {
          from: '2023-01-01T00:00:00Z',
          to: '2023-01-02T00:00:00Z',
        },
      };

      const request = {} as KibanaRequest;

      const response = await registry.getAllSuggestionsForOwners(
        ['observability'],
        context,
        request
      );

      expect(response.suggestions).toHaveLength(1);
      expect(response.suggestions[0].id).toBe('suggestion-1');

      expect(mockHandler1).toHaveBeenCalledWith({ request, context });
      expect(mockHandler2).toHaveBeenCalledWith({ request, context });
    });

    it('should not suggestions with the same id to be registered', async () => {
      const suggestionType: SuggestionType = {
        id: 'duplicate-suggestion',
        owner: 'observability',
        attachmentId: 'attachment-1',
        tools: {},
        handlers: {},
      };

      registry.register(suggestionType);

      expect(() => registry.register(suggestionType)).toThrow(
        `Item "duplicate-suggestion" is already registered on registry AttachmentSuggestionRegistry`
      );
    });
  });
});
