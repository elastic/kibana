/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { STREAM_ATTACHMENT_TYPE } from '../../../common/agent_builder/stream_attachment';
import { STREAMS_TOOL_IDS } from '../tools/tool_ids';
import { createStreamAttachmentType } from './stream_attachment_type';

const mockStorageClient = {
  get: jest.fn(),
};

jest.mock('../../lib/streams/storage/streams_storage_client', () => ({
  createStreamsStorageClient: jest.fn(() => mockStorageClient),
}));

const logger = loggingSystemMock.createLogger();
const coreSetup = coreMock.createSetup();

const attachmentType = createStreamAttachmentType({ core: coreSetup, logger });

describe('streamAttachmentType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('id', () => {
    it('equals stream', () => {
      expect(attachmentType.id).toBe(STREAM_ATTACHMENT_TYPE);
    });
  });

  describe('isReadonly', () => {
    it('is true', () => {
      expect(attachmentType.isReadonly).toBe(true);
    });
  });

  describe('validate', () => {
    it('accepts valid stream attachment data', () => {
      const result = attachmentType.validate({
        stream_name: 'logs.nginx',
        stream_type: 'wired',
        description: 'Nginx logs',
      });
      expect(result).toEqual({
        valid: true,
        data: { stream_name: 'logs.nginx', stream_type: 'wired', description: 'Nginx logs' },
      });
    });

    it('rejects missing stream_name', () => {
      const result = attachmentType.validate({
        stream_type: 'wired',
        description: 'Nginx logs',
      });
      expect(result).toEqual(expect.objectContaining({ valid: false }));
    });

    it('rejects invalid stream_type', () => {
      const result = attachmentType.validate({
        stream_name: 'logs.nginx',
        stream_type: 'invalid',
        description: '',
      });
      expect(result).toEqual(expect.objectContaining({ valid: false }));
    });

    it('accepts all valid stream types', () => {
      for (const streamType of ['wired', 'classic', 'query', 'unknown']) {
        const result = attachmentType.validate({
          stream_name: 'test',
          stream_type: streamType,
          description: '',
        });
        expect(result).toEqual(expect.objectContaining({ valid: true }));
      }
    });
  });

  describe('format', () => {
    it('returns text representation with stream metadata', async () => {
      const formatted = await attachmentType.format(
        {
          data: {
            stream_name: 'logs.nginx',
            stream_type: 'wired',
            description: 'Nginx access logs',
          },
        } as never,
        {} as never
      );

      const representation = await formatted.getRepresentation!();
      expect(representation.type).toBe('text');
      expect(representation.value).toContain('Stream: logs.nginx');
      expect(representation.value).toContain('Type: wired');
      expect(representation.value).toContain('Description: Nginx access logs');
    });

    it('omits description line when empty', async () => {
      const formatted = await attachmentType.format(
        {
          data: {
            stream_name: 'metrics.cpu',
            stream_type: 'classic',
            description: '',
          },
        } as never,
        {} as never
      );

      const representation = await formatted.getRepresentation!();
      expect(representation.value).not.toContain('Description:');
    });
  });

  describe('resolve', () => {
    it('resolves stream definition by origin name', async () => {
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
          type: 'wired',
          description: 'Nginx access logs',
          ingest: { wired: {} },
        },
      });

      const result = await attachmentType.resolve!('logs.nginx', {} as never);

      expect(result).toEqual({
        stream_name: 'logs.nginx',
        stream_type: 'wired',
        description: 'Nginx access logs',
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

      const result = await attachmentType.resolve!('missing', {} as never);

      expect(result).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("failed to resolve 'missing'")
      );
    });
  });

  describe('getTools', () => {
    it('returns all streams tool IDs', () => {
      expect(attachmentType.getTools!()).toEqual([...STREAMS_TOOL_IDS]);
    });
  });

  describe('getAgentDescription', () => {
    it('returns a description string', () => {
      const description = attachmentType.getAgentDescription!();
      expect(description).toContain('stream');
    });
  });
});
