/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isInternalError } from '@kbn/agent-builder-common';
import { createClient, type ToolHealthClient } from './client';
import type { ToolHealthStatus } from './types';

// Test constants
const testSpace = 'default';
const testDate = '2024-12-12T10:00:00.000Z';

// Helper to create mock health documents
const createMockHealthDoc = (
  overrides: {
    toolId?: string;
    status?: ToolHealthStatus;
    errorMessage?: string;
    consecutiveFailures?: number;
  } = {}
) => ({
  _id: `${testSpace}:${overrides.toolId ?? 'my-tool'}`,
  _source: {
    tool_id: overrides.toolId ?? 'my-tool',
    space: testSpace,
    status: overrides.status ?? 'healthy',
    last_check: testDate,
    error_message: overrides.errorMessage ?? '',
    consecutive_failures: overrides.consecutiveFailures ?? 0,
    updated_at: testDate,
  },
});

// Mock ES client with proper typing
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

jest.mock('./storage', () => ({
  createStorage: jest.fn(() => ({
    getClient: jest.fn(() => mockEsClient),
  })),
}));

describe('ToolHealthClient', () => {
  let client: ToolHealthClient;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    jest.clearAllMocks();

    client = createClient({
      space: testSpace,
      logger,
      esClient: {} as never, // Storage is mocked, this value is unused
    });
  });

  describe('get', () => {
    it('returns undefined when no health record exists', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      const result = await client.get('non-existent-tool');

      expect(result).toBeUndefined();
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 1,
          terminate_after: 1,
        })
      );
    });

    it('returns health state when record exists', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockHealthDoc()] },
      });

      const result = await client.get('my-tool');

      expect(result).toBeDefined();
      expect(result?.status).toBe('healthy');
      expect(result?.toolId).toBe('my-tool');
      expect(result?.consecutiveFailures).toBe(0);
    });

    it('filters by tool_id in query', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.get('test-tool');

      // Note: createSpaceDslFilter creates a complex space query, so we verify the tool_id part
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: expect.arrayContaining([{ term: { tool_id: 'test-tool' } }]),
            },
          },
        })
      );
    });
  });

  describe('upsert', () => {
    it('creates a new health record', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
      mockEsClient.index.mockResolvedValue({});

      const result = await client.upsert('my-tool', {
        status: 'healthy',
        consecutiveFailures: 0,
      });

      expect(result.status).toBe('healthy');
      expect(result.toolId).toBe('my-tool');
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'default:my-tool',
          document: expect.objectContaining({
            tool_id: 'my-tool',
            space: testSpace,
            status: 'healthy',
            consecutive_failures: 0,
          }),
        })
      );
    });

    it('uses deterministic document ID based on space and toolId', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
      mockEsClient.index.mockResolvedValue({});

      await client.upsert('my-mcp-tool', { status: 'healthy' });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'default:my-mcp-tool',
        })
      );
    });

    it('preserves existing consecutiveFailures when not provided', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createMockHealthDoc({ status: 'failed', consecutiveFailures: 5 })],
        },
      });
      mockEsClient.index.mockResolvedValue({});

      await client.upsert('my-tool', { status: 'healthy' });

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            consecutive_failures: 5,
          }),
        })
      );
    });

    it('logs debug message on update', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
      mockEsClient.index.mockResolvedValue({});

      await client.upsert('my-tool', { status: 'healthy' });

      expect(logger.debug).toHaveBeenCalledWith('Updated health state for tool my-tool: healthy');
    });
  });

  describe('delete', () => {
    it('deletes the health record by deterministic ID', async () => {
      mockEsClient.delete.mockResolvedValue({ result: 'deleted' });

      const result = await client.delete('my-tool');

      expect(result).toBe(true);
      expect(mockEsClient.delete).toHaveBeenCalledWith({
        id: 'default:my-tool',
      });
    });

    it('returns false when document was not found', async () => {
      mockEsClient.delete.mockResolvedValue({ result: 'not_found' });

      const result = await client.delete('non-existent-tool');

      expect(result).toBe(false);
    });
  });

  describe('listBySpace', () => {
    it('returns all health states for the space', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createMockHealthDoc({ toolId: 'tool-1', status: 'healthy' }),
            createMockHealthDoc({
              toolId: 'tool-2',
              status: 'failed',
              errorMessage: 'Connection error',
              consecutiveFailures: 3,
            }),
          ],
        },
      });

      const result = await client.listBySpace();

      expect(result).toHaveLength(2);
      expect(result[0].toolId).toBe('tool-1');
      expect(result[0].status).toBe('healthy');
      expect(result[1].toolId).toBe('tool-2');
      expect(result[1].status).toBe('failed');
    });

    it('returns empty array when no health records exist', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      const result = await client.listBySpace();

      expect(result).toEqual([]);
    });
  });

  describe('recordSuccess', () => {
    it('sets status to healthy and resets consecutive failures', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
      mockEsClient.index.mockResolvedValue({});

      const result = await client.recordSuccess('my-tool');

      expect(result.status).toBe('healthy');
      expect(result.consecutiveFailures).toBe(0);
      expect(result.errorMessage).toBeUndefined();
    });

    it('clears previous error state', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [
            createMockHealthDoc({
              status: 'failed',
              errorMessage: 'Previous connection error',
              consecutiveFailures: 5,
            }),
          ],
        },
      });
      mockEsClient.index.mockResolvedValue({});

      await client.recordSuccess('my-tool');

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            status: 'healthy',
            consecutive_failures: 0,
            error_message: '',
          }),
        })
      );
    });
  });

  describe('recordFailure', () => {
    it('sets status to failed and increments consecutive failures from 0', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
      mockEsClient.index.mockResolvedValue({});

      const result = await client.recordFailure('my-tool', 'Connection refused');

      expect(result.status).toBe('failed');
      expect(result.consecutiveFailures).toBe(1);
      expect(result.errorMessage).toBe('Connection refused');
    });

    it('increments consecutive failures from existing count', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: [createMockHealthDoc({ status: 'failed', consecutiveFailures: 2 })],
        },
      });
      mockEsClient.index.mockResolvedValue({});

      const result = await client.recordFailure('my-tool', 'New connection error');

      expect(result.consecutiveFailures).toBe(3);
      expect(result.errorMessage).toBe('New connection error');
    });

    it('records error message correctly', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
      mockEsClient.index.mockResolvedValue({});

      await client.recordFailure('my-tool', 'MCP connector not found');

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            error_message: 'MCP connector not found',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    const esError = new Error('ES connection failed');

    describe('get', () => {
      it('throws internal error on ES failure', async () => {
        mockEsClient.search.mockRejectedValue(esError);

        await expect(client.get('my-tool')).rejects.toThrow();

        const error = await client.get('my-tool').catch((e) => e);
        expect(isInternalError(error)).toBe(true);
        expect(error.message).toContain('Failed to get health state for tool my-tool');
      });

      it('logs error on ES failure', async () => {
        mockEsClient.search.mockRejectedValue(esError);

        await client.get('my-tool').catch(() => {});

        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to get health state for tool my-tool')
        );
      });
    });

    describe('upsert', () => {
      it('throws internal error on ES index failure', async () => {
        mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
        mockEsClient.index.mockRejectedValue(esError);

        await expect(client.upsert('my-tool', { status: 'healthy' })).rejects.toThrow();

        const error = await client.upsert('my-tool', { status: 'healthy' }).catch((e) => e);
        expect(isInternalError(error)).toBe(true);
        expect(error.message).toContain('Failed to upsert health state for tool my-tool');
      });

      it('logs error on ES failure', async () => {
        mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
        mockEsClient.index.mockRejectedValue(esError);

        await client.upsert('my-tool', { status: 'healthy' }).catch(() => {});

        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to upsert health state for tool my-tool')
        );
      });
    });

    describe('delete', () => {
      it('returns false on ES failure (fire-and-forget friendly)', async () => {
        mockEsClient.delete.mockRejectedValue(esError);

        const result = await client.delete('my-tool');

        expect(result).toBe(false);
      });

      it('logs debug on ES failure', async () => {
        mockEsClient.delete.mockRejectedValue(esError);

        await client.delete('my-tool');

        expect(logger.debug).toHaveBeenCalledWith(
          expect.stringContaining('Failed to delete health state for tool my-tool')
        );
      });

      it('does not throw on ES failure', async () => {
        mockEsClient.delete.mockRejectedValue(esError);

        await expect(client.delete('my-tool')).resolves.toBe(false);
      });
    });

    describe('listBySpace', () => {
      it('throws internal error on ES failure', async () => {
        mockEsClient.search.mockRejectedValue(esError);

        await expect(client.listBySpace()).rejects.toThrow();

        const error = await client.listBySpace().catch((e) => e);
        expect(isInternalError(error)).toBe(true);
        expect(error.message).toContain('Failed to list health states for space');
      });

      it('logs error on ES failure', async () => {
        mockEsClient.search.mockRejectedValue(esError);

        await client.listBySpace().catch(() => {});

        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to list health states for space')
        );
      });
    });

    describe('fire-and-forget pattern', () => {
      it('errors from recordSuccess can be caught and ignored', async () => {
        mockEsClient.search.mockRejectedValue(esError);

        // This simulates the fire-and-forget pattern used in tool_registry.ts
        const promise = client.recordSuccess('my-tool').catch(() => {});

        await expect(promise).resolves.toBeUndefined();
      });

      it('errors from recordFailure can be caught and ignored', async () => {
        mockEsClient.search.mockRejectedValue(esError);

        // This simulates the fire-and-forget pattern used in tool_registry.ts
        const promise = client.recordFailure('my-tool', 'test error').catch(() => {});

        await expect(promise).resolves.toBeUndefined();
      });
    });
  });
});
