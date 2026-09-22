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
import { FileNotFoundError, type FilesStart } from '@kbn/files-plugin/server';
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
  const asScoped = jest.fn(() => ({ getById }));
  const plugin = {
    fileServiceFactory: { asScoped },
  } as unknown as FilesStart;
  return { plugin, asScoped, getById, downloadContent };
};

const createValidateFilesPluginStub = () => {
  const getById = jest.fn(async () => ({ data: {} }));
  const asScoped = jest.fn(() => ({ getById }));
  const plugin = { fileServiceFactory: { asScoped } } as unknown as FilesStart;
  return { plugin, asScoped, getById };
};

describe('image attachment type', () => {
  describe('validate', () => {
    const validateContext = { request: httpServerMock.createKibanaRequest() };

    it('rejects a payload without file_id', async () => {
      const definition = createImageAttachmentType({
        getFilesPlugin: async () => ({} as FilesStart),
      });
      const result = await definition.validate(
        { name: 'x.png', mime_type: 'image/png' },
        validateContext
      );
      expect(result.valid).toBe(false);
    });

    it('accepts when the file exists', async () => {
      const { plugin } = createValidateFilesPluginStub();
      const definition = createImageAttachmentType({ getFilesPlugin: async () => plugin });
      const result = await definition.validate(validImage, validateContext);
      expect(result.valid).toBe(true);
    });

    it('rejects when file not found (getById throws FileNotFoundError)', async () => {
      const getById = jest.fn(async () => {
        throw new FileNotFoundError('File not found');
      });
      const asScoped = jest.fn(() => ({ getById }));
      const plugin = { fileServiceFactory: { asScoped } } as unknown as FilesStart;
      const definition = createImageAttachmentType({ getFilesPlugin: async () => plugin });
      const result = await definition.validate(validImage, validateContext);
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toBe('image file not found');
    });

    it('propagates transient errors instead of treating them as not-found', async () => {
      const getById = jest.fn(async () => {
        throw new Error('ES cluster unavailable');
      });
      const asScoped = jest.fn(() => ({ getById }));
      const plugin = { fileServiceFactory: { asScoped } } as unknown as FilesStart;
      const definition = createImageAttachmentType({ getFilesPlugin: async () => plugin });
      await expect(definition.validate(validImage, validateContext)).rejects.toThrow(
        'ES cluster unavailable'
      );
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
      const { plugin, asScoped, getById, downloadContent } = createFilesPluginStub(
        Buffer.from('hello')
      );
      const definition = createImageAttachmentType({ getFilesPlugin: async () => plugin });
      const formatted = await definition.format(buildAttachment(validImage), formatContext);
      const repr = await formatted.getRepresentation?.();
      expect(asScoped).not.toHaveBeenCalled();
      expect(getById).not.toHaveBeenCalled();
      expect(downloadContent).not.toHaveBeenCalled();

      if (repr?.type !== 'image') throw new Error('expected image representation');
      const base64 = await repr.getBase64();
      expect(asScoped).toHaveBeenCalledWith(formatContext.request);
      expect(getById).toHaveBeenCalledWith({ id: 'file-abc' });
      expect(base64).toBe(Buffer.from('hello').toString('base64'));
    });
  });
});
