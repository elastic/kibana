/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import type { SmlListItem } from '@kbn/agent-builder-plugin/server';
import {
  STREAM_SML_TYPE,
  STREAM_ATTACHMENT_TYPE,
} from '../../../common/agent_builder/stream_attachment';
import { createStreamSmlType } from './stream_sml_type';

const mockStorageClient = {
  search: jest.fn(),
  get: jest.fn(),
};

jest.mock('../../lib/streams/storage/streams_storage_client', () => ({
  createStreamsStorageClient: jest.fn(() => mockStorageClient),
}));

const logger = loggingSystemMock.createLogger();
const coreSetup = coreMock.createSetup();

const smlType = createStreamSmlType({ core: coreSetup, logger });

const createContext = () => ({
  esClient: {} as never,
  savedObjectsClient: {} as never,
  logger: loggingSystemMock.createLogger(),
});

async function collectPages(iterable: AsyncIterable<SmlListItem[]>): Promise<SmlListItem[]> {
  const items: SmlListItem[] = [];
  for await (const page of iterable) {
    items.push(...page);
  }
  return items;
}

describe('streamSmlType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('id', () => {
    it('equals stream', () => {
      expect(smlType.id).toBe(STREAM_SML_TYPE);
    });
  });

  describe('fetchFrequency', () => {
    it('returns 30m', () => {
      expect(smlType.fetchFrequency!()).toBe('30m');
    });
  });

  describe('list', () => {
    it('yields stream items with spaces: ["*"]', async () => {
      mockStorageClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'logs.nginx',
              _source: {
                name: 'logs.nginx',
                type: 'wired',
                description: 'Nginx logs',
                updated_at: '2025-01-01T00:00:00Z',
              },
              sort: ['logs.nginx'],
            },
            {
              _id: 'metrics.cpu',
              _source: {
                name: 'metrics.cpu',
                type: 'classic',
                description: '',
                updated_at: '2025-01-02T00:00:00Z',
              },
              sort: ['metrics.cpu'],
            },
          ],
        },
      });

      const items = await collectPages(smlType.list(createContext() as never));

      expect(items).toEqual([
        { id: 'logs.nginx', updatedAt: '2025-01-01T00:00:00Z', spaces: ['*'] },
        { id: 'metrics.cpu', updatedAt: '2025-01-02T00:00:00Z', spaces: ['*'] },
      ]);
    });

    it('filters out legacy group documents', async () => {
      mockStorageClient.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'logs',
              _source: {
                name: 'logs',
                type: 'wired',
                description: '',
                updated_at: '2025-01-01T00:00:00Z',
                group: {},
              },
              sort: ['logs'],
            },
            {
              _id: 'logs.nginx',
              _source: {
                name: 'logs.nginx',
                type: 'wired',
                description: 'Nginx',
                updated_at: '2025-01-01T00:00:00Z',
              },
              sort: ['logs.nginx'],
            },
          ],
        },
      });

      const items = await collectPages(smlType.list(createContext() as never));

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('logs.nginx');
    });

    it('paginates through multiple pages', async () => {
      const page1Hits = Array.from({ length: 1000 }, (_, i) => ({
        _id: `stream-${i}`,
        _source: {
          name: `stream-${i}`,
          type: 'wired',
          description: '',
          updated_at: '2025-01-01T00:00:00Z',
        },
        sort: [`stream-${i}`],
      }));

      const page2Hits = [
        {
          _id: 'stream-1000',
          _source: {
            name: 'stream-1000',
            type: 'classic',
            description: '',
            updated_at: '2025-01-01T00:00:00Z',
          },
          sort: ['stream-1000'],
        },
      ];

      mockStorageClient.search
        .mockResolvedValueOnce({ hits: { hits: page1Hits } })
        .mockResolvedValueOnce({ hits: { hits: page2Hits } });

      const items = await collectPages(smlType.list(createContext() as never));

      expect(items).toHaveLength(1001);
      expect(mockStorageClient.search).toHaveBeenCalledTimes(2);
    });

    it('returns empty when no streams exist', async () => {
      mockStorageClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      });

      const items = await collectPages(smlType.list(createContext() as never));

      expect(items).toEqual([]);
    });
  });

  describe('getSmlData', () => {
    it('returns chunk with name, description, and type for a wired stream', async () => {
      mockStorageClient.get.mockResolvedValueOnce({
        _source: {
          name: 'logs.nginx',
          type: 'wired',
          description: 'Nginx access logs',
          ingest: { wired: {} },
        },
      });

      const result = await smlType.getSmlData('logs.nginx', createContext() as never);

      expect(result).toEqual({
        chunks: [
          {
            type: STREAM_SML_TYPE,
            title: 'logs.nginx',
            content: 'logs.nginx\nNginx access logs\ntype: wired',
            permissions: ['api:read_stream'],
          },
        ],
      });
    });

    it('returns chunk for a query stream', async () => {
      mockStorageClient.get.mockResolvedValueOnce({
        _source: {
          name: 'logs.nginx.errors',
          type: 'query',
          description: 'Nginx error subset',
          query: { esql: 'FROM logs.nginx | WHERE level = "error"' },
        },
      });

      const result = await smlType.getSmlData('logs.nginx.errors', createContext() as never);

      expect(result!.chunks[0].content).toContain('type: query');
      expect(result!.chunks[0].title).toBe('logs.nginx.errors');
    });

    it('returns undefined and logs warning on error', async () => {
      mockStorageClient.get.mockRejectedValueOnce(new Error('Not found'));
      const context = createContext();

      const result = await smlType.getSmlData('missing-stream', context as never);

      expect(result).toBeUndefined();
      expect(context.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("failed to get data for 'missing-stream'")
      );
    });
  });

  describe('toAttachment', () => {
    it('returns stream attachment with resolved data', async () => {
      const mockCoreStart = {
        elasticsearch: {
          client: {
            asInternalUser: {},
          },
        },
      };
      coreSetup.getStartServices.mockResolvedValueOnce([mockCoreStart, {}, {}] as never);

      mockStorageClient.get.mockResolvedValueOnce({
        _source: {
          name: 'logs.nginx',
          type: 'classic',
          description: 'Classic nginx stream',
          ingest: { classic: {} },
        },
      });

      const result = await smlType.toAttachment({ origin_id: 'logs.nginx' } as never, {} as never);

      expect(result).toEqual({
        type: STREAM_ATTACHMENT_TYPE,
        data: {
          stream_name: 'logs.nginx',
          stream_type: 'classic',
          description: 'Classic nginx stream',
        },
        origin: 'logs.nginx',
        description: 'logs.nginx',
      });
    });

    it('returns undefined and logs warning on error', async () => {
      const mockCoreStart = {
        elasticsearch: {
          client: {
            asInternalUser: {},
          },
        },
      };
      coreSetup.getStartServices.mockResolvedValueOnce([mockCoreStart, {}, {}] as never);
      mockStorageClient.get.mockRejectedValueOnce(new Error('Not found'));

      const result = await smlType.toAttachment(
        { origin_id: 'missing-stream' } as never,
        {} as never
      );

      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("failed to convert 'missing-stream' to attachment")
      );
    });
  });
});
