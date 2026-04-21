/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isPluginNotFoundError, type UnmanagedPluginAssets } from '@kbn/agent-builder-common';
import { createClient, type PluginClient } from './client';
import type { PluginProperties } from './storage';

const testSpace = 'default';

const emptyUnmanagedAssets: UnmanagedPluginAssets = {
  agents: [],
  hooks: [],
  mcp_servers: [],
  output_styles: [],
  lsp_servers: [],
};

const createMockPluginSource = (overrides?: Partial<PluginProperties>): PluginProperties => ({
  id: 'plugin-1',
  name: 'test-plugin',
  version: '1.0.0',
  space: testSpace,
  description: 'A test plugin',
  manifest: {
    author: { name: 'Author' },
  },
  skill_ids: [],
  unmanaged_assets: emptyUnmanagedAssets,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const createMockPluginDoc = (overrides?: Partial<PluginProperties>) => ({
  _id: 'es-doc-id',
  _source: createMockPluginSource(overrides),
});

interface MockEsClient {
  search: jest.Mock;
  index: jest.Mock;
  delete: jest.Mock;
}

const mockEsClient: MockEsClient = {
  search: jest.fn(),
  index: jest.fn(),
  delete: jest.fn(),
};

jest.mock('./storage', () => {
  const actual = jest.requireActual('./storage');
  return {
    ...actual,
    createStorage: jest.fn(() => ({
      getClient: jest.fn(() => mockEsClient),
    })),
  };
});

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'generated-uuid'),
}));

describe('PluginClient', () => {
  let client: PluginClient;

  beforeEach(() => {
    jest.clearAllMocks();

    client = createClient({
      space: testSpace,
      logger: loggerMock.create(),
      esClient: {} as never,
    });
  });

  describe('get', () => {
    it('returns the plugin when it exists', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockPluginDoc()] },
      });

      const result = await client.get('plugin-1');

      expect(result.id).toBe('plugin-1');
      expect(result.name).toBe('test-plugin');
    });

    it('throws PluginNotFoundError when not found', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      try {
        await client.get('non-existent');
        fail('Expected error to be thrown');
      } catch (e) {
        expect(isPluginNotFoundError(e)).toBe(true);
      }
    });
  });

  describe('list', () => {
    it('returns all plugins in the space', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createMockPluginDoc({ id: 'p1', name: 'plugin-a' }),
            createMockPluginDoc({ id: 'p2', name: 'plugin-b' }),
          ],
          total: { value: 2 },
        },
      });

      const result = await client.list();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('p1');
      expect(result[1].id).toBe('p2');
    });

    it('returns empty list when no plugins exist', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
      });

      const result = await client.list();
      expect(result).toEqual([]);
    });
  });

  describe('has', () => {
    it('returns true when plugin exists', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockPluginDoc()] },
      });

      expect(await client.has('plugin-1')).toBe(true);
    });

    it('returns false when plugin does not exist', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      expect(await client.has('non-existent')).toBe(false);
    });
  });

  describe('findByName', () => {
    it('returns the plugin when found by name', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockPluginDoc()] },
      });

      const result = await client.findByName('test-plugin');

      expect(result).toBeDefined();
      expect(result!.name).toBe('test-plugin');
    });

    it('returns undefined when not found', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      const result = await client.findByName('non-existent');
      expect(result).toBeUndefined();
    });

    it('queries with the name term filter', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.findByName('my-plugin');

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([{ term: { name: 'my-plugin' } }]),
            },
          },
        })
      );
    });
  });

  describe('create', () => {
    it('creates a plugin and returns the persisted definition', async () => {
      // findByName returns no match (name is unique)
      mockEsClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        // get after create returns the new doc
        .mockResolvedValueOnce({
          hits: {
            hits: [
              createMockPluginDoc({
                id: 'generated-uuid',
                name: 'new-plugin',
                version: '1.0.0',
              }),
            ],
          },
        });
      mockEsClient.index.mockResolvedValue({ result: 'created' });

      const result = await client.create({
        name: 'new-plugin',
        version: '1.0.0',
        description: 'Brand new',
        manifest: {},
        unmanaged_assets: {
          agents: [],
          hooks: [],
          mcp_servers: [],
          output_styles: [],
          lsp_servers: [],
        },
      });

      expect(result.id).toBe('generated-uuid');
      expect(result.name).toBe('new-plugin');
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            id: 'generated-uuid',
            name: 'new-plugin',
            space: testSpace,
          }),
        })
      );
    });

    it('throws BadRequestError when name already exists', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockPluginDoc({ id: 'existing-id', name: 'dup-plugin' })] },
      });

      try {
        await client.create({
          name: 'dup-plugin',
          version: '1.0.0',
          description: '',
          manifest: {},
          unmanaged_assets: {
            agents: [],
            hooks: [],
            mcp_servers: [],
            output_styles: [],
            lsp_servers: [],
          },
        });
        fail('Expected error to be thrown');
      } catch (e) {
        expect((e as Error).message).toMatch(/already exists/);
      }

      expect(mockEsClient.index).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates an existing plugin', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockPluginDoc()] },
      });
      mockEsClient.index.mockResolvedValue({ result: 'updated' });

      const result = await client.update('plugin-1', { version: '2.0.0' });

      expect(result.version).toBe('2.0.0');
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'es-doc-id',
          document: expect.objectContaining({ version: '2.0.0' }),
        })
      );
    });

    it('throws PluginNotFoundError when plugin does not exist', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      try {
        await client.update('non-existent', { version: '2.0.0' });
        fail('Expected error to be thrown');
      } catch (e) {
        expect(isPluginNotFoundError(e)).toBe(true);
      }
    });
  });

  describe('delete', () => {
    it('deletes an existing plugin', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockPluginDoc()] },
      });
      mockEsClient.delete.mockResolvedValue({ result: 'deleted' });

      await expect(client.delete('plugin-1')).resolves.toBeUndefined();

      expect(mockEsClient.delete).toHaveBeenCalledWith({ id: 'es-doc-id' });
    });

    it('throws PluginNotFoundError when plugin does not exist', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      try {
        await client.delete('non-existent');
        fail('Expected error to be thrown');
      } catch (e) {
        expect(isPluginNotFoundError(e)).toBe(true);
      }
    });

    it('throws PluginNotFoundError when ES returns not_found', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockPluginDoc()] },
      });
      mockEsClient.delete.mockResolvedValue({ result: 'not_found' });

      try {
        await client.delete('plugin-1');
        fail('Expected error to be thrown');
      } catch (e) {
        expect(isPluginNotFoundError(e)).toBe(true);
      }
    });
  });
});
