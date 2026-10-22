/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createPdfConverter } from './pdf_converter';

const mockExtractDocument = jest.fn();
jest.mock('../extraction/extract_document', () => ({
  extractDocument: (params: unknown) => mockExtractDocument(params),
}));

describe('pdf converter', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = {} as ElasticsearchClient;
  const mockIsAvailable = jest.fn();
  const extractionAvailability = {
    isAvailable: mockIsAvailable,
    start: jest.fn(),
    stop: jest.fn(),
  };
  const converter = createPdfConverter({
    getEsClient: async () => esClient,
    extractionAvailability,
    logger,
  });
  const signal = new AbortController().signal;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractDocument.mockResolvedValue('# Invoice');
  });

  it('reads the PDF with the document extraction', async () => {
    const bytes = Buffer.from('%PDF-1.7 fake');

    const text = await converter.toText({
      bytes,
      fileId: 'file-abc',
      signal,
    });

    expect(text).toBe('# Invoice');
    expect(mockExtractDocument).toHaveBeenCalledWith({
      esClient,
      pdf: bytes,
      fileId: 'file-abc',
      signal,
      logger,
    });
  });

  it('fails when the file does not start with the PDF header', async () => {
    await expect(
      converter.toText({
        bytes: Buffer.from('hello'),
        fileId: 'file-abc',
        signal,
      })
    ).rejects.toThrow('The file is damaged or has the wrong file type.');
    expect(mockExtractDocument).not.toHaveBeenCalled();
  });

  it.each([true, false])('is available: %s when the document extraction is', (available) => {
    mockIsAvailable.mockReturnValue(available);
    expect(converter.isAvailable()).toBe(available);
  });
});
