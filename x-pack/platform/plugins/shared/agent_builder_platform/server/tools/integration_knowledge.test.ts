/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { ToolResultType } from '@kbn/agent-builder-common';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { integrationKnowledgeTool } from './integration_knowledge';
import type { AgentBuilderPlatformPluginStart, PluginStartDependencies } from '../types';

describe('integrationKnowledgeTool', () => {
  let mockCoreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>;
  let mockSearch: jest.Mock;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;

  // Create a simple mock ES client with just the search method we need
  const createMockEsClient = () => ({
    asInternalUser: {
      search: mockSearch,
    },
    asCurrentUser: {
      search: mockSearch,
    },
    asSecondaryAuthUser: {
      search: mockSearch,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreSetup = coreMock.createSetup() as unknown as CoreSetup<
      PluginStartDependencies,
      AgentBuilderPlatformPluginStart
    >;
    mockSearch = jest.fn();
    mockLogger = loggingSystemMock.createLogger();
    mockRequest = httpServerMock.createKibanaRequest();
  });

  describe('tool definition', () => {
    it('returns a tool with the correct id', () => {
      const tool = integrationKnowledgeTool(mockCoreSetup);
      expect(tool.id).toBe(platformCoreTools.integrationKnowledge);
    });

    it('returns a tool with the correct description', () => {
      const tool = integrationKnowledgeTool(mockCoreSetup);
      expect(tool.description).toContain('Fleet-installed integrations');
    });

    it('has correct tags', () => {
      const tool = integrationKnowledgeTool(mockCoreSetup);
      expect(tool.tags).toEqual(['integration', 'knowledge-base', 'fleet']);
    });

    it('has availability config with global cache mode', () => {
      const tool = integrationKnowledgeTool(mockCoreSetup);
      expect(tool.availability?.cacheMode).toBe('global');
    });
  });

  describe('handler', () => {
    const createHandlerContext = () => ({
      esClient: createMockEsClient(),
      logger: mockLogger,
      request: mockRequest,
      spaceId: 'default',
      modelProvider: {} as any,
      toolProvider: {} as any,
      runner: {} as any,
      resultStore: {} as any,
      events: {} as any,
    });

    it('returns resource results with highlighted chunks from semantic search', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              _id: 'doc-1',
              _source: {
                package_name: 'nginx',
                filename: 'README.md',
                content: 'Full nginx integration documentation content that is very long.',
                version: '1.2.3',
              },
              highlight: {
                content: [
                  'Relevant chunk about nginx configuration.',
                  'Another relevant chunk about nginx setup.',
                ],
              },
            },
            {
              _id: 'doc-2',
              _source: {
                package_name: 'apache',
                filename: 'setup.md',
                content: 'Apache setup instructions.',
                version: '2.0.0',
              },
              // No highlight - should fall back to full content
            },
          ],
        },
      };

      mockSearch.mockResolvedValue(mockSearchResponse);

      const tool = integrationKnowledgeTool(mockCoreSetup);
      const result = (await tool.handler(
        { query: 'How to configure nginx?', max: 5 },
        createHandlerContext() as any
      )) as ToolHandlerStandardReturn;

      expect(mockSearch).toHaveBeenCalledWith({
        index: '.integration_knowledge',
        size: 5,
        query: {
          semantic: {
            field: 'content',
            query: 'How to configure nginx?',
          },
        },
        highlight: {
          fields: {
            content: {
              order: 'score',
              number_of_fragments: 5,
            },
          },
        },
        _source: ['package_name', 'filename', 'content', 'version'],
      });

      expect(result.results).toHaveLength(2);

      // First result should use highlighted chunks
      expect(result.results[0]).toMatchObject({
        type: ToolResultType.other,
        data: {
          reference: {
            url: '/app/integrations/detail/nginx',
            title: 'nginx integration (v1.2.3) - README.md',
          },
          partial: true, // partial because we're returning chunks, not full content
          content: {
            package_name: 'nginx',
            filename: 'README.md',
            version: '1.2.3',
            content:
              'Relevant chunk about nginx configuration.\n\n---\n\nAnother relevant chunk about nginx setup.',
          },
        },
      });

      // Second result should fall back to full content (no highlights)
      expect(result.results[1]).toMatchObject({
        type: ToolResultType.other,
        data: {
          reference: {
            url: '/app/integrations/detail/apache',
            title: 'apache integration (v2.0.0) - setup.md',
          },
          partial: false,
          content: {
            package_name: 'apache',
            filename: 'setup.md',
            version: '2.0.0',
            content: 'Apache setup instructions.',
          },
        },
      });
    });

    it('truncates content when no highlights and content is very long', async () => {
      const veryLongContent = 'A'.repeat(5000);
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              _id: 'doc-1',
              _source: {
                package_name: 'system',
                filename: 'README.md',
                content: veryLongContent,
                version: '1.0.0',
              },
              // No highlights - should fall back to truncated content
            },
          ],
        },
      };

      mockSearch.mockResolvedValue(mockSearchResponse);

      const tool = integrationKnowledgeTool(mockCoreSetup);
      const result = (await tool.handler(
        { query: 'system integration', max: 5 },
        createHandlerContext() as any
      )) as ToolHandlerStandardReturn;

      expect(result.results[0]).toMatchObject({
        type: ToolResultType.other,
        data: {
          partial: true,
          content: {
            content: expect.stringContaining('[Content truncated...]'),
          },
        },
      });
      // Verify content is truncated to MAX_CONTENT_LENGTH (4000) + truncation message
      const data = result.results[0].data as { content: { content: string } };
      expect(data.content.content.length).toBeLessThan(veryLongContent.length);
    });

    it('handles packages without version', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [
            {
              _id: 'doc-1',
              _source: {
                package_name: 'mysql',
                filename: 'docs.md',
                content: 'MySQL documentation.',
              },
            },
          ],
        },
      };

      mockSearch.mockResolvedValue(mockSearchResponse);

      const tool = integrationKnowledgeTool(mockCoreSetup);
      const result = (await tool.handler(
        { query: 'MySQL setup', max: 5 },
        createHandlerContext() as any
      )) as ToolHandlerStandardReturn;

      expect(result.results[0]).toMatchObject({
        type: ToolResultType.other,
        data: {
          reference: {
            url: '/app/integrations/detail/mysql',
            title: 'mysql integration - docs.md',
          },
        },
      });
    });

    it('returns error result when no documents found', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [],
        },
      };

      mockSearch.mockResolvedValue(mockSearchResponse);

      const tool = integrationKnowledgeTool(mockCoreSetup);
      const result = (await tool.handler(
        { query: 'nonexistent integration', max: 5 },
        createHandlerContext() as any
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        type: ToolResultType.error,
        data: {
          message: 'No integration knowledge found for the given query.',
          metadata: {
            query: 'nonexistent integration',
          },
        },
      });
    });

    it('returns error result when search fails', async () => {
      mockSearch.mockRejectedValue(new Error('Elasticsearch connection failed'));

      const tool = integrationKnowledgeTool(mockCoreSetup);
      const result = (await tool.handler(
        { query: 'test query', max: 5 },
        createHandlerContext() as any
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        type: ToolResultType.error,
        data: {
          message: expect.stringContaining('Failed to retrieve integration knowledge'),
        },
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error retrieving integration knowledge')
      );
    });

    it('uses default max value of 5 when not provided', async () => {
      const mockSearchResponse = {
        hits: {
          hits: [],
        },
      };

      mockSearch.mockResolvedValue(mockSearchResponse);

      const tool = integrationKnowledgeTool(mockCoreSetup);
      // The schema has a default value, so we can pass undefined for max
      // but TypeScript requires us to pass something, so we test the actual default behavior
      await tool.handler(
        { query: 'test', max: undefined as unknown as number },
        createHandlerContext() as any
      );

      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 5,
          highlight: {
            fields: {
              content: {
                order: 'score',
                number_of_fragments: 5,
              },
            },
          },
        })
      );
    });
  });

  describe('availability handler', () => {
    const createAvailabilityContext = () => ({
      request: mockRequest,
      uiSettings: uiSettingsServiceMock.createClient(),
      spaceId: 'default',
    });

    const setupMockCoreStartServices = () => {
      const mockCoreStart = coreMock.createStart();
      Object.assign(mockCoreStart.elasticsearch.client, {
        asInternalUser: { search: mockSearch },
        asCurrentUser: { search: mockSearch },
      });
      (mockCoreSetup.getStartServices as jest.Mock).mockResolvedValue([mockCoreStart, {}, {}]);
    };

    it('returns available when index exists', async () => {
      setupMockCoreStartServices();
      mockSearch.mockResolvedValue({});

      const tool = integrationKnowledgeTool(mockCoreSetup);
      const availability = await tool.availability!.handler!(createAvailabilityContext());

      expect(availability.status).toBe('available');
      expect(mockSearch).toHaveBeenCalledWith({
        index: '.integration_knowledge',
        size: 0,
      });
    });

    it('returns unavailable when index does not exist', async () => {
      setupMockCoreStartServices();
      mockSearch.mockRejectedValue(new Error('index_not_found_exception'));

      const tool = integrationKnowledgeTool(mockCoreSetup);
      const availability = await tool.availability!.handler!(createAvailabilityContext());

      expect(availability.status).toBe('unavailable');
    });

    it('returns unavailable when getStartServices fails', async () => {
      (mockCoreSetup.getStartServices as jest.Mock).mockRejectedValue(
        new Error('Services not available')
      );

      const tool = integrationKnowledgeTool(mockCoreSetup);
      const availability = await tool.availability!.handler!(createAvailabilityContext());

      expect(availability.status).toBe('unavailable');
    });
  });
});
