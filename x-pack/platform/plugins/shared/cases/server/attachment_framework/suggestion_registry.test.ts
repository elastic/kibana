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
import { loggerMock } from '@kbn/logging-mocks';

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
        attachmentTypeId: 'attachment-1',
        handlers: {
          testHandler: {
            handler: jest.fn(),
            tool: {
              description: 'Handler 1 for test suggestion',
            },
          },
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
        attachmentTypeId: 'attachment-1',
        owner: 'observability',
        handlers: {},
      };

      const suggestionType2: SuggestionType = {
        id: 'suggestion-2',
        attachmentTypeId: 'attachment-2',
        owner: 'securitySolution',
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
        attachmentTypeId: 'attachment-1',
        handlers: {
          handler1: {
            handler: mockHandler1,
            tool: {
              description: 'Handler 1 for test suggestion',
            },
          },
          handler2: {
            handler: mockHandler2,
            tool: {
              description: 'Handler 2 for test suggestion',
            },
          },
        },
      };

      registry.register(suggestionType);

      const context: SuggestionContext = {
        spaceId: 'default',
        'service.name': ['test-service'],
        timeRange: {
          from: '2023-01-01T00:00:00Z',
          to: '2023-01-02T00:00:00Z',
        },
      };

      const request = {} as KibanaRequest;

      const response = await registry.getAllSuggestionsForOwners(
        ['observability'],
        context,
        request,
        loggerMock.create()
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
        attachmentTypeId: 'attachment-1',
        owner: 'observability',
        handlers: {
          handler1: {
            handler: mockHandler1,
            tool: {
              description: 'Handler 1 for test suggestion',
            },
          },
          handler2: {
            handler: mockHandler2,
            tool: {
              description: 'Handler 2 for test suggestion',
            },
          },
        },
      };

      registry.register(suggestionType);

      const context: SuggestionContext = {
        spaceId: 'default',
        'service.name': ['test-service'],
        timeRange: {
          from: '2023-01-01T00:00:00Z',
          to: '2023-01-02T00:00:00Z',
        },
      };

      const request = {} as KibanaRequest;

      const response = await registry.getAllSuggestionsForOwners(
        ['observability'],
        context,
        request,
        loggerMock.create()
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
        attachmentTypeId: 'attachment-1',
        handlers: {},
      };

      registry.register(suggestionType);

      expect(() => registry.register(suggestionType)).toThrow(
        `Item "duplicate-suggestion" is already registered on registry AttachmentSuggestionRegistry`
      );
    });

    it('logs error when handler fails', async () => {
      const mockLogger = loggerMock.create();
      const mockHandler: SuggestionHandler = jest.fn(async () => {
        throw new Error('Handler failed');
      });

      const suggestionType: SuggestionType = {
        id: 'test-suggestion',
        owner: 'observability',
        attachmentTypeId: 'attachment-1',
        handlers: {
          handler1: {
            handler: mockHandler,
            tool: {
              description: 'Handler 1 for test suggestion',
            },
          },
        },
      };

      registry.register(suggestionType);

      const context: SuggestionContext = {
        spaceId: 'default',
        'service.name': ['test-service'],
        timeRange: {
          from: '2023-01-01T00:00:00Z',
          to: '2023-01-02T00:00:00Z',
        },
      };

      const request = {} as KibanaRequest;

      await registry.getAllSuggestionsForOwners(['observability'], context, request, mockLogger);

      expect(mockHandler).toHaveBeenCalledWith({ request, context });
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get suggestion.', {
        error: expect.any(Error),
      });
    });
  });
});
