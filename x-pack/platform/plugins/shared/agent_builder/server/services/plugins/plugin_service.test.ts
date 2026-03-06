/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ParsedPluginArchive } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core/server';
import { PluginServiceImpl } from './plugin_service';
import type { PluginClient, PersistedPluginDefinition } from './client';

const mockParsePluginFromUrl = jest.fn();
jest.mock('./utils', () => ({
  parsePluginFromUrl: (...args: unknown[]) => mockParsePluginFromUrl(...args),
}));

const mockCreateClient = jest.fn();
jest.mock('./client', () => ({
  ...jest.requireActual('./client'),
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

jest.mock('../../utils/spaces', () => ({
  getCurrentSpaceId: jest.fn(() => 'default'),
}));

const createMockParsedArchive = (
  overrides?: Partial<ParsedPluginArchive>
): ParsedPluginArchive => ({
  manifest: {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: { name: 'Author' },
    homepage: 'https://example.com',
    repository: 'https://github.com/test/repo',
    license: 'MIT',
    keywords: ['test'],
  },
  skills: [],
  unmanagedAssets: {
    commands: ['commands/cmd.md'],
    agents: [],
    hooks: [],
    mcpServers: [],
    outputStyles: [],
    lspServers: [],
  },
  ...overrides,
});

const createMockPersistedPlugin = (
  overrides?: Partial<PersistedPluginDefinition>
): PersistedPluginDefinition => ({
  id: 'generated-id',
  name: 'my-plugin',
  version: '1.0.0',
  description: 'A test plugin',
  manifest: {
    author: { name: 'Author' },
    homepage: 'https://example.com',
    repository: 'https://github.com/test/repo',
    license: 'MIT',
    keywords: ['test'],
  },
  source_url: 'https://github.com/test/repo/tree/main/plugin',
  skill_ids: [],
  unmanaged_assets: {
    commands: ['commands/cmd.md'],
    agents: [],
    hooks: [],
    mcpServers: [],
    outputStyles: [],
    lspServers: [],
  },
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

describe('PluginServiceImpl', () => {
  let service: PluginServiceImpl;
  let mockClient: jest.Mocked<PluginClient>;
  const mockRequest = {} as KibanaRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      get: jest.fn(),
      list: jest.fn(),
      has: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockCreateClient.mockReturnValue(mockClient);

    const mockElasticsearch = {
      client: {
        asScoped: jest.fn(() => ({
          asInternalUser: {},
        })),
      },
    };

    service = new PluginServiceImpl({
      logger: loggerMock.create(),
      elasticsearch: mockElasticsearch as any,
    });
  });

  describe('getScopedClient', () => {
    it('creates a client with the correct parameters', async () => {
      const client = await service.getScopedClient({ request: mockRequest });

      expect(client).toBe(mockClient);
      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.objectContaining({
          space: 'default',
        })
      );
    });
  });

  describe('installPlugin', () => {
    it('parses the URL, creates the plugin record, and returns it', async () => {
      const parsedArchive = createMockParsedArchive();
      const persistedPlugin = createMockPersistedPlugin();

      mockParsePluginFromUrl.mockResolvedValue(parsedArchive);
      mockClient.findByName.mockResolvedValue(undefined);
      mockClient.create.mockResolvedValue(persistedPlugin);

      const result = await service.installPlugin({
        request: mockRequest,
        url: 'https://github.com/test/repo/tree/main/plugin',
      });

      expect(mockParsePluginFromUrl).toHaveBeenCalledWith(
        'https://github.com/test/repo/tree/main/plugin'
      );

      expect(mockClient.findByName).toHaveBeenCalledWith('my-plugin');

      expect(mockClient.create).toHaveBeenCalledWith({
        name: 'my-plugin',
        version: '1.0.0',
        description: 'A test plugin',
        manifest: {
          author: { name: 'Author' },
          homepage: 'https://example.com',
          repository: 'https://github.com/test/repo',
          license: 'MIT',
          keywords: ['test'],
        },
        source_url: 'https://github.com/test/repo/tree/main/plugin',
        skill_ids: [],
        unmanaged_assets: parsedArchive.unmanagedAssets,
      });

      expect(result).toBe(persistedPlugin);
    });

    it('defaults version to 0.0.0 when manifest has no version', async () => {
      const parsedArchive = createMockParsedArchive({
        manifest: { name: 'no-version-plugin' },
      });

      mockParsePluginFromUrl.mockResolvedValue(parsedArchive);
      mockClient.findByName.mockResolvedValue(undefined);
      mockClient.create.mockResolvedValue(createMockPersistedPlugin());

      await service.installPlugin({
        request: mockRequest,
        url: 'https://example.com/plugin.zip',
      });

      expect(mockClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '0.0.0',
          description: '',
        })
      );
    });

    it('throws BadRequestError when a plugin with the same name already exists', async () => {
      mockParsePluginFromUrl.mockResolvedValue(createMockParsedArchive());
      mockClient.findByName.mockResolvedValue(
        createMockPersistedPlugin({ id: 'existing-id', version: '0.9.0' })
      );

      try {
        await service.installPlugin({
          request: mockRequest,
          url: 'https://example.com/plugin.zip',
        });
        fail('Expected error to be thrown');
      } catch (e) {
        expect((e as Error).message).toMatch(/already installed/);
      }

      expect(mockClient.create).not.toHaveBeenCalled();
    });

    it('propagates errors from parsePluginFromUrl', async () => {
      mockParsePluginFromUrl.mockRejectedValue(new Error('Download failed'));

      await expect(
        service.installPlugin({
          request: mockRequest,
          url: 'https://example.com/bad.zip',
        })
      ).rejects.toThrow('Download failed');
    });
  });
});
