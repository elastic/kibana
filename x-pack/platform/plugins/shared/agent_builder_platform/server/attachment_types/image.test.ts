/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Attachment, ImageAttachmentData } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { FilesStart } from '@kbn/files-plugin/server';
import { createImageAttachmentType } from './image';

const validImage: ImageAttachmentData = {
  file_id: 'file-abc',
  name: 'screenshot.png',
  mime_type: 'image/png',
};

const formatContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
};

const buildAttachment = (
  data: ImageAttachmentData
): Attachment<AttachmentType.image, ImageAttachmentData> => ({
  id: 'test-attachment-id',
  type: AttachmentType.image,
  data,
});

const createFilesPluginStub = (bytes: Buffer) => {
  const downloadContent = jest.fn(async () => Readable.from(bytes));
  const getById = jest.fn(async () => ({ downloadContent }));
  const asInternal = jest.fn(() => ({ getById }));
  const plugin = {
    fileServiceFactory: { asInternal },
  } as unknown as FilesStart;
  return { plugin, asInternal, getById, downloadContent };
};

describe('image attachment type', () => {
  describe('validate', () => {
    const definition = createImageAttachmentType({
      getFilesPlugin: async () => ({} as FilesStart),
    });

    it('accepts a payload with file_id, name and mime_type', async () => {
      const result = await definition.validate(validImage);
      expect(result.valid).toBe(true);
    });

    it('rejects a payload without file_id', async () => {
      const result = await definition.validate({ name: 'x.png', mime_type: 'image/png' });
      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('returns an image representation with the attachment mime type', async () => {
      const { plugin } = createFilesPluginStub(Buffer.from('hello'));
      const definition = createImageAttachmentType({ getFilesPlugin: async () => plugin });
      const formatted = await definition.format(buildAttachment(validImage), formatContext);
      const repr = await formatted.getRepresentation?.();
      expect(repr?.type).toBe('image');
      if (repr?.type === 'image') {
        expect(repr.mimeType).toBe('image/png');
      }
    });

    it('fetches base64 lazily from the Files plugin only when getBase64 is called', async () => {
      const { plugin, asInternal, getById, downloadContent } = createFilesPluginStub(
        Buffer.from('hello')
      );
      const definition = createImageAttachmentType({ getFilesPlugin: async () => plugin });
      const formatted = await definition.format(buildAttachment(validImage), formatContext);
      const repr = await formatted.getRepresentation?.();
      expect(asInternal).not.toHaveBeenCalled();
      expect(getById).not.toHaveBeenCalled();
      expect(downloadContent).not.toHaveBeenCalled();

      if (repr?.type !== 'image') throw new Error('expected image representation');
      const base64 = await repr.getBase64();
      expect(getById).toHaveBeenCalledWith({ id: 'file-abc' });
      expect(base64).toBe(Buffer.from('hello').toString('base64'));
    });
  });
});
