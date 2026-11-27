/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { TextAttachmentRepresentation } from '@kbn/agent-builder-server/attachments';
import { FILE_UPLOAD_ATTACHMENT_TYPE, type FileUploadAttachment } from '@kbn/file-upload-common';
import { createFileUploadAttachmentType } from './file_upload_attachment_type';

const request = httpServerMock.createKibanaRequest();

const createEsClient = () => ({
  count: jest.fn().mockResolvedValue({ count: 42 }),
  indices: {
    exists: jest.fn().mockResolvedValue(true),
    getMapping: jest.fn().mockResolvedValue({
      'my-index': {
        mappings: {
          properties: {
            message: { type: 'text' },
            host: { properties: { name: { type: 'keyword' } } },
          },
        },
      },
    }),
  },
});

const setup = () => {
  const esClient = createEsClient();
  const logger = loggerMock.create();
  const type = createFileUploadAttachmentType({
    getEsClient: async () => esClient as unknown as ElasticsearchClient,
    logger,
  });
  return { type, esClient, logger };
};

const attachment = (overrides: Partial<FileUploadAttachment> = {}): FileUploadAttachment => ({
  id: 'attachment-1',
  type: FILE_UPLOAD_ATTACHMENT_TYPE,
  data: { reason: 'Analyze your sales export' },
  ...overrides,
});

const represent = async (
  type: ReturnType<typeof setup>['type'],
  input: FileUploadAttachment
): Promise<string> => {
  const formatted = await type.format(input, { request, spaceId: 'default' });
  const representation = (await formatted.getRepresentation!()) as TextAttachmentRepresentation;
  return representation.value;
};

const withOrigin = (origin: string) => ({
  id: 'attachment-1',
  type: FILE_UPLOAD_ATTACHMENT_TYPE,
  origin,
  current_version: 1,
  versions: [],
});

const originContext = {
  request,
  conversationId: 'conversation-1',
  agentId: 'agent-1',
  canManageAgents: true,
};

describe('createFileUploadAttachmentType', () => {
  describe('validate', () => {
    it('accepts the optional presentation hints', () => {
      const { type } = setup();

      expect(type.validate({ reason: 'why', suggested_index_name: 'sales' })).toEqual({
        valid: true,
        data: { reason: 'why', suggested_index_name: 'sales' },
      });
    });

    it('rejects data of the wrong shape', () => {
      const { type } = setup();

      expect(type.validate({ reason: 42 })).toMatchObject({ valid: false });
    });
  });

  describe('format', () => {
    it('tells the agent the user has not uploaded yet when there is no origin', async () => {
      const { type, esClient } = setup();

      const value = await represent(type, attachment());

      expect(value).toContain('have not uploaded a file yet');
      expect(value).toContain('Analyze your sales export');
      expect(esClient.count).not.toHaveBeenCalled();
    });

    it('describes the uploaded index, its document count and fields', async () => {
      const { type, esClient } = setup();

      const value = await represent(type, attachment({ origin: 'my-index' }));

      expect(esClient.count).toHaveBeenCalledWith({ index: 'my-index' });
      expect(value).toContain('"my-index"');
      expect(value).toContain('Document count: 42.');
      expect(value).toContain('message (text)');
      expect(value).toContain('host.name (keyword)');
    });

    it('reports an unreadable index instead of failing', async () => {
      const { type, esClient, logger } = setup();
      esClient.count.mockRejectedValue(new Error('forbidden'));

      const value = await represent(type, attachment({ origin: 'my-index' }));

      expect(value).toContain('cannot currently be read');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('onOriginUpdated', () => {
    it('accepts an existing index', async () => {
      const { type, esClient } = setup();

      await expect(
        type.onOriginUpdated!(withOrigin('my-index'), originContext)
      ).resolves.toBeUndefined();
      expect(esClient.indices.exists).toHaveBeenCalledWith({ index: 'my-index' });
    });

    it.each(['logs-*', 'a,b', '_all', '-index', 'has space'])(
      'rejects "%s" without querying Elasticsearch',
      async (origin) => {
        const { type, esClient } = setup();

        await expect(type.onOriginUpdated!(withOrigin(origin), originContext)).rejects.toThrow(
          'is not a valid index name'
        );
        expect(esClient.indices.exists).not.toHaveBeenCalled();
      }
    );

    it('rejects an index that does not exist', async () => {
      const { type, esClient } = setup();
      esClient.indices.exists.mockResolvedValue(false);

      await expect(type.onOriginUpdated!(withOrigin('missing'), originContext)).rejects.toThrow(
        'does not exist'
      );
    });
  });
});
