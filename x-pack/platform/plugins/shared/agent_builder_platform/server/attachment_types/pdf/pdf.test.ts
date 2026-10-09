/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { Subject } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Attachment, PdfAttachmentData } from '@kbn/agent-builder-common/attachments';
import {
  AttachmentType,
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
  CHAT_ATTACHMENT_PDFS_FILE_KIND,
  MAX_PDF_BYTES,
  MAX_PDF_TEXT_LENGTH,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentResolveContext } from '@kbn/agent-builder-server/attachments';
import { FileNotFoundError, type FilesStart } from '@kbn/files-plugin/server';
import { pdfErrors } from './errors';

const mockExtractDocument = jest.fn();
jest.mock('./extract_document', () => ({
  extractDocument: (params: unknown) => mockExtractDocument(params),
}));

const mockIsPdfExtractionAvailable = jest.fn();
jest.mock('./extraction_availability', () => ({
  isPdfExtractionAvailable: () => mockIsPdfExtractionAvailable(),
}));

import { createPdfAttachmentType } from './pdf';

const validData: PdfAttachmentData = { file_id: 'file-abc', name: 'invoice.pdf', text: 'Hello' };

const createFilesPluginStub = ({
  fileKind = CHAT_ATTACHMENT_PDFS_FILE_KIND,
  size = 100,
  bytes = Buffer.from('%PDF-1.7 fake'),
}: { fileKind?: string; size?: number; bytes?: Buffer } = {}) => {
  const deleteFile = jest.fn(async () => {});
  const downloadContent = jest.fn(async () => Readable.from(bytes));
  const getById = jest.fn(async () => ({
    data: { fileKind, name: 'invoice.pdf', size },
    downloadContent,
    delete: deleteFile,
  }));
  const asScoped = jest.fn(() => ({ getById }));
  const plugin = { fileServiceFactory: { asScoped } } as unknown as FilesStart;
  return { plugin, getById, downloadContent, deleteFile };
};

describe('pdf attachment type', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = {} as ElasticsearchClient;

  const createDefinition = (plugin: FilesStart) =>
    createPdfAttachmentType({
      getFilesPlugin: async () => plugin,
      getEsClient: async () => esClient,
      logger,
    });

  const createResolveContext = (request: KibanaRequest): AttachmentResolveContext => ({
    request,
    spaceId: 'default',
    savedObjectsClient: {} as AttachmentResolveContext['savedObjectsClient'],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPdfExtractionAvailable.mockReturnValue(true);
    mockExtractDocument.mockResolvedValue('# Invoice\n\nHello');
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
        { file_id: 'file-abc', name: 'invoice.pdf' },
        validateContext
      );
      expect(result.valid).toBe(false);
    });

    it('rejects text that is too long', async () => {
      const { plugin } = createFilesPluginStub();
      const result = await createDefinition(plugin).validate(
        { ...validData, text: 'a'.repeat(500_001) },
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

      expect(result).toEqual({ valid: false, error: 'PDF file not found.' });
    });

    it('rejects when the file is not a PDF file kind', async () => {
      const { plugin } = createFilesPluginStub({ fileKind: CHAT_ATTACHMENT_IMAGES_FILE_KIND });
      const result = await createDefinition(plugin).validate(validData, validateContext);
      expect(result).toEqual({ valid: false, error: 'PDF file not found.' });
    });
  });

  describe('resolve', () => {
    const request = httpServerMock.createKibanaRequest();

    it('returns the file id, the name and the extracted text', async () => {
      const { plugin, getById } = createFilesPluginStub();

      const data = await createDefinition(plugin).resolve!(
        'file-abc',
        createResolveContext(request)
      );

      expect(getById).toHaveBeenCalledWith({ id: 'file-abc' });
      expect(data).toEqual({
        file_id: 'file-abc',
        name: 'invoice.pdf',
        text: '# Invoice\n\nHello',
      });
      expect(mockExtractDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          pdf: Buffer.from('%PDF-1.7 fake'),
          fileId: 'file-abc',
          fileName: 'invoice.pdf',
          esClient,
        })
      );
    });

    it('fails when PDF extraction is not available and does not read the file', async () => {
      mockIsPdfExtractionAvailable.mockReturnValue(false);
      const { plugin, getById } = createFilesPluginStub();

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('PDF reading is not available on this deployment.');
      expect(getById).not.toHaveBeenCalled();
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
      ).rejects.toThrow('PDF file not found.');
    });

    it('fails with the same message when the file is not a PDF file kind', async () => {
      const { plugin, downloadContent } = createFilesPluginStub({
        fileKind: CHAT_ATTACHMENT_IMAGES_FILE_KIND,
      });

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('PDF file not found.');
      expect(downloadContent).not.toHaveBeenCalled();
    });

    it('fails before the download when the file size is over the limit', async () => {
      const { plugin, downloadContent } = createFilesPluginStub({ size: MAX_PDF_BYTES + 1 });

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('The PDF is larger than 10 MB.');
      expect(downloadContent).not.toHaveBeenCalled();
    });

    it('fails when the downloaded bytes are over the limit', async () => {
      const { plugin } = createFilesPluginStub({
        size: 100,
        bytes: Buffer.alloc(MAX_PDF_BYTES + 1),
      });

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('The PDF is larger than 10 MB.');
      expect(mockExtractDocument).not.toHaveBeenCalled();
    });

    it('fails when the extracted text is too long', async () => {
      mockExtractDocument.mockResolvedValue('a'.repeat(MAX_PDF_TEXT_LENGTH + 1));
      const { plugin } = createFilesPluginStub();

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('The text of the PDF is too long. Try a smaller PDF.');
    });

    it('fails when the file does not start with the PDF header', async () => {
      const { plugin } = createFilesPluginStub({ bytes: Buffer.from('hello') });

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('The file is not a valid PDF.');
      expect(mockExtractDocument).not.toHaveBeenCalled();
    });

    it('passes the error of the extraction on and keeps the file', async () => {
      mockExtractDocument.mockRejectedValue(pdfErrors.timeout());
      const { plugin, deleteFile } = createFilesPluginStub();

      await expect(
        createDefinition(plugin).resolve!('file-abc', createResolveContext(request))
      ).rejects.toThrow('Reading the PDF took too long. Try a smaller PDF.');
      expect(deleteFile).not.toHaveBeenCalled();
    });

    describe('when the client disconnects', () => {
      const setup = () => {
        const aborted$ = new Subject<void>();
        const abortedRequest = { events: { aborted$ } } as unknown as KibanaRequest;
        mockExtractDocument.mockImplementation(
          ({ signal }: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              signal.addEventListener('abort', () => reject(new Error('aborted')), {
                once: true,
              });
              aborted$.complete();
            })
        );
        return { abortedRequest };
      };

      it('deletes the PDF from the Files API and rethrows', async () => {
        const { abortedRequest } = setup();
        const { plugin, deleteFile } = createFilesPluginStub();

        await expect(
          createDefinition(plugin).resolve!('file-abc', createResolveContext(abortedRequest))
        ).rejects.toThrow('aborted');
        expect(deleteFile).toHaveBeenCalledTimes(1);
      });

      it('still rethrows when the delete fails', async () => {
        const { abortedRequest } = setup();
        const { plugin, deleteFile } = createFilesPluginStub();
        deleteFile.mockRejectedValue(new Error('delete failed'));

        await expect(
          createDefinition(plugin).resolve!('file-abc', createResolveContext(abortedRequest))
        ).rejects.toThrow('aborted');
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('delete failed'));
      });
    });
  });

  describe('format', () => {
    it('returns the text of the PDF', async () => {
      const { plugin } = createFilesPluginStub();
      const attachment: Attachment<AttachmentType.pdf, PdfAttachmentData> = {
        id: 'attachment-1',
        type: AttachmentType.pdf,
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
