/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { Logger } from '@kbn/logging';
import { SmlCrawlerService } from './crawler_service';

const createLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

describe('SmlCrawlerService', () => {
  it('indexes new attachments', async () => {
    const list = jest
      .fn()
      .mockResolvedValue([
        { attachmentId: 'a1', attachmentType: 'text', updatedAt: '2025-01-01T00:00:00Z' },
      ]);
    const definition = {
      id: 'text',
      sml: {
        list,
      },
    } as unknown as AttachmentTypeDefinition;

    const indexer = { indexAttachment: jest.fn().mockResolvedValue(undefined) };
    const crawlerState = {
      listByType: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      delete: jest.fn(),
    };

    const crawler = new SmlCrawlerService({
      esClient: {} as any,
      savedObjectsClient: {} as any,
      attachmentsService: {
        listTypeDefinitions: () => [definition],
      } as any,
      logger: createLogger(),
      crawlerState: crawlerState as any,
      indexerService: indexer as any,
    });

    await crawler.crawlAttachmentType('text');

    expect(indexer.indexAttachment).toHaveBeenCalledWith({
      attachmentId: 'a1',
      attachmentType: 'text',
      action: 'create',
      spaceId: 'default',
    });
  });

  it('deletes missing attachments', async () => {
    const definition = {
      id: 'text',
      sml: {
        list: jest.fn().mockResolvedValue([]),
      },
    } as unknown as AttachmentTypeDefinition;

    const indexer = { indexAttachment: jest.fn().mockResolvedValue(undefined) };
    const crawlerState = {
      listByType: jest.fn().mockResolvedValue([
        {
          id: 'text:a1:default',
          attachment_id: 'a1',
          attachment_type: 'text',
          space_id: 'default',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          update_action: null,
        },
      ]),
      upsert: jest.fn(),
      delete: jest.fn(),
    };

    const crawler = new SmlCrawlerService({
      esClient: {} as any,
      savedObjectsClient: {} as any,
      attachmentsService: {
        listTypeDefinitions: () => [definition],
      } as any,
      logger: createLogger(),
      crawlerState: crawlerState as any,
      indexerService: indexer as any,
    });

    await crawler.crawlAttachmentType('text');

    expect(indexer.indexAttachment).toHaveBeenCalledWith({
      attachmentId: 'a1',
      attachmentType: 'text',
      action: 'delete',
      spaceId: 'default',
    });
  });
});
