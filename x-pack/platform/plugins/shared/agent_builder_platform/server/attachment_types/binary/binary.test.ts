/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { Subject } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type {
  Attachment,
  BinaryAttachmentData,
  SupportedBinaryMimeType,
} from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  CHAT_ATTACHMENT_BINARIES_FILE_KIND,
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
  MAX_BINARY_BYTES,
  MAX_BINARY_TEXT_LENGTH,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import { FileNotFoundError, type FilesStart } from '@kbn/files-plugin/server';
import type { BinaryConverter, BinaryConverters } from './converters';
import { binaryErrors } from './errors';
import { createBinaryAttachmentType } from './binary';

const validData: BinaryAttachmentData = {
  file_id: 'file-abc',
  name: 'invoice.pdf',
  mime_type: 'application/pdf',
  text: 'Hello',
};

const createFilesPluginStub = ({
  fileKind = CHAT_ATTACHMENT_BINARIES_FILE_KIND,
  mimeType = 'application/pdf',
  name = 'invoice.pdf',
  size = 100,
  bytes = Buffer.from('%PDF-1.7 fake'),
}: {
  fileKind?: string;
  mimeType?: string | null;
  name?: string;
  size?: number;
  bytes?: Buffer;
} = {}) => {
  const deleteFile = jest.fn(async () => {});
  const downloadContent = jest.fn(async () => Readable.from(bytes));
  const getById = jest.fn(async () => ({
    data: { fileKind, mimeType: mimeType ?? undefined, name, size },
    downloadContent,
    delete: deleteFile,
  }));
  const asScoped = jest.fn(() => ({ getById }));
  const plugin = { fileServiceFactory: { asScoped } } as unknown as FilesStart;
  return { plugin, getById, downloadContent, deleteFile };
};

const createConverterMock = () => ({
  isAvailable: jest.fn<boolean, []>(() => true),
  toText: jest.fn<ReturnType<BinaryConverter['toText']>, Parameters<BinaryConverter['toText']>>(
    async () => '# Invoice\n\nHello'
  ),
});

describe('binary attachment type', () => {
  const converterMocks: Record<SupportedBinaryMimeType, ReturnType<typeof createConverterMock>> = {
    'application/pdf': createConverterMock(),
  };
  const binaryConverters: BinaryConverters = converterMocks;
  const pdfConverter = converterMocks['application/pdf'];

  const createDefinition = (plugin: FilesStart) =>
    createBinaryAttachmentType({
      getFilesPlugin: async () => plugin,
      binaryConverters,
    });

  const createResolveContext = (request: KibanaRequest): AttachmentResolveContext => ({
    request,
    spaceId: 'default',
    savedObjectsClient: {} as AttachmentResolveContext['savedObjectsClient'],
  });

  beforeEach(() => {
    Object.values(converterMocks).forEach((converter) => {
      converter.isAvailable.mockReset().mockReturnValue(true);
      converter.toText.mockReset().mockResolvedValue('# Invoice\n\nHello');
    });
  });

  describe('validate', () => {
    const validateContext = { request: httpServerMock.createKibanaRequest() };

    it('accepts valid data when the file exists', async () => {
      const { plugin } = createFilesPluginStub();
      const result = await createDefinition(plugin).validate(validData, validateContext);
      expect(result).toEqual({ valid: true, data: validData });
    });

    it('rejects data without text', async () => {
      const { plugin } = createFilesPluginStub();
      const result = await createDefinition(plugin).validate(
        { file_id: 'file-abc', name: 'invoice.pdf', mime_type: 'application/pdf' },
        validateContext
      );
      expect(result.valid).toBe(false);
    });

    it('rejects an unknown mime type', async () => {
      const { plugin } = createFilesPluginStub();
      const result = await createDefinition(plugin).validate(
        { ...validData, mime_type: 'application/zip' },
        validateContext
      );
      expect(result.valid).toBe(false);
    });

    it('rejects a markdown mime type', async () => {
      const { plugin } = createFilesPluginStub();
      const result = await createDefinition(plugin).validate(
        { ...validData, name: 'notes.md', mime_type: 'text/markdown' },
        validateContext
      );
      expect(result.valid).toBe(false);
    });

    it('rejects text that is too long', async () => {
      const { plugin } = createFilesPluginStub();
      const result = await createDefinition(plugin).validate(
        { ...validData, text: 'a'.repeat(MAX_BINARY_TEXT_LENGTH + 1) },
        validateContext
      );
      expect(result.valid).toBe(false);
    });

    it('rejects when there is no request context', async () => {
      const { plugin } = createFilesPluginStub();
      const result = await createDefinition(plugin).validate(validData);
      expect(result).toEqual({ valid: false, error: 'missing request context' });
    });

    it('rejects when the file is not found', async () => {
      const getById = jest.fn(async () => {
        throw new FileNotFoundError('missing');
      });
      const plugin = {
        fileServiceFactory: { asScoped: () => ({ getById }) },
      } as unknown as FilesStart;

      const result = await createDefinition(plugin).validate(validData, validateContext);

      expect(result).toEqual({ valid: false, error: 'File not found.' });
    });

    it('rejects when the file is not a binary file kind', async () => {
      const { plugin } = createFilesPluginStub({ fileKind: CHAT_ATTACHMENT_IMAGES_FILE_KIND });
      const result = await createDefinition(plugin).validate(validData, validateContext);
      expect(result).toEqual({ valid: false, error: 'File not found.' });
    });
  });

  describe('resolve', () => {
    const request = httpServerMock.createKibanaRequest();

    it('returns the file id, the name, the mime type and the text', async () => {
      const { plugin, getById } = createFilesPluginStub();

      const data = await createDefinition(plugin).resolve!(
        'file-abc',
        createResolveContext(request)
      );

      expect(getById).toHaveBeenCalledWith({ id: 'file-abc' });
      expect(data).toEqual({
        file_id: 'file-abc',
        name: 'invoice.pdf',
        mime_type: 'application/pdf',
        text: '# Invoice\n\nHello',
      });
      expect(pdfConverter.toText).toHaveBeenCalledWith(
        expect.objectContaining({
          bytes: Buffer.from('%PDF-1.7 fake'),
          fileId: 'file-abc',
        })
      );
    });

    it.each([null, 'text/plain', 'application/zip'])(
      'fails without a download when the file mime type is %s',
      async (mimeType) => {
        const { plugin, downloadContent } = createFilesPluginStub({ mimeType });

        await expect(
          createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
        ).rejects.toThrow('This file type is not supported.');
        expect(downloadContent).not.toHaveBeenCalled();
      }
    );

    it('fails when the converter is not available and does not download the file', async () => {
      pdfConverter.isAvailable.mockReturnValue(false);
      const { plugin, downloadContent } = createFilesPluginStub();

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('Reading this file type is not available on this deployment.');
      expect(downloadContent).not.toHaveBeenCalled();
    });

    it('fails when the file is not found', async () => {
      const getById = jest.fn(async () => {
        throw new FileNotFoundError('missing');
      });
      const plugin = {
        fileServiceFactory: { asScoped: () => ({ getById }) },
      } as unknown as FilesStart;

      await expect(
        createDefinition(plugin).resolve!('does-not-exist', createResolveContext(request))
      ).rejects.toThrow('File not found.');
    });

    it('fails with the same message when the file is not a binary file kind', async () => {
      const { plugin, downloadContent } = createFilesPluginStub({
        fileKind: CHAT_ATTACHMENT_IMAGES_FILE_KIND,
      });

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('File not found.');
      expect(downloadContent).not.toHaveBeenCalled();
    });

    it('fails before the download when the file size is over the limit', async () => {
      const { plugin, downloadContent } = createFilesPluginStub({
        size: MAX_BINARY_BYTES['application/pdf'] + 1,
      });

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('The file is larger than 10 MB.');
      expect(downloadContent).not.toHaveBeenCalled();
    });

    it('fails when the downloaded bytes are over the limit', async () => {
      const { plugin } = createFilesPluginStub({
        size: 100,
        bytes: Buffer.alloc(MAX_BINARY_BYTES['application/pdf'] + 1),
      });

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('The file is larger than 10 MB.');
      expect(pdfConverter.toText).not.toHaveBeenCalled();
    });

    it('fails when the text is too long', async () => {
      pdfConverter.toText.mockResolvedValue('a'.repeat(MAX_BINARY_TEXT_LENGTH + 1));
      const { plugin } = createFilesPluginStub();

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('The text of the file is too long. Try a smaller file.');
    });

    it('passes the error of the converter on and keeps the file', async () => {
      pdfConverter.toText.mockRejectedValue(binaryErrors.timeout());
      const { plugin, deleteFile } = createFilesPluginStub();

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('Reading the file took too long. Try a smaller file.');
      expect(deleteFile).not.toHaveBeenCalled();
    });

    describe('when the client disconnects', () => {
      const setup = () => {
        const aborted$ = new Subject<void>();
        const abortedRequest = { events: { aborted$ } } as unknown as KibanaRequest;
        pdfConverter.toText.mockImplementation(
          ({ signal }) =>
            new Promise((_resolve, reject) => {
              signal.addEventListener('abort', () => reject(new Error('aborted')), {
                once: true,
              });
              aborted$.complete();
            })
        );
        return { abortedRequest };
      };

      it('rethrows and keeps the file', async () => {
        const { abortedRequest } = setup();
        const { plugin, deleteFile } = createFilesPluginStub();

        await expect(
          createDefinition(plugin).resolve!('file-abc', createResolveContext(abortedRequest))
        ).rejects.toThrow('aborted');
        expect(deleteFile).not.toHaveBeenCalled();
      });
    });
  });

  describe('format', () => {
    it('returns the text of the file', async () => {
      const { plugin } = createFilesPluginStub();
      const attachment: Attachment<AttachmentType.binary, BinaryAttachmentData> = {
        id: 'attachment-1',
        type: AttachmentType.binary,
        data: validData,
      };

      const formatted = await createDefinition(plugin).format(attachment, {
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'default',
      });

      expect(await formatted.getRepresentation!()).toEqual({ type: 'text', value: 'Hello' });
    });
  });

  it('is read only and exposes no tools', () => {
    const { plugin } = createFilesPluginStub();
    const definition = createDefinition(plugin);
    expect(definition.isReadonly).toBe(true);
    expect(definition.getTools!()).toEqual([]);
  });
});
