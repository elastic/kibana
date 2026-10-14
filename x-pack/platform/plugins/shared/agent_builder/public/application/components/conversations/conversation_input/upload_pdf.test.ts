/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_PDF_BYTES } from '@kbn/agent-builder-common/attachments';
import {
  MAX_PDFS_PER_MESSAGE,
  rejectIfTooManyPdfs,
  rejectInvalidPdf,
  uploadPdf,
} from './upload_pdf';

jest.mock('@kbn/agent-builder-browser', () => ({
  formatAgentBuilderErrorMessage: (error: Error) => error.message,
}));

const createPdf = ({ type = 'application/pdf', size = 4 } = {}) =>
  new File([new Uint8Array(size)], 'invoice.pdf', { type });

describe('rejectInvalidPdf', () => {
  it('accepts a small PDF', () => {
    const addErrorToast = jest.fn();

    expect(rejectInvalidPdf({ file: createPdf(), addErrorToast })).toBe(false);
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it('accepts a PDF of exactly the maximum size', () => {
    const addErrorToast = jest.fn();

    expect(rejectInvalidPdf({ file: createPdf({ size: MAX_PDF_BYTES }), addErrorToast })).toBe(
      false
    );
  });

  it('rejects a file that is not a PDF', () => {
    const addErrorToast = jest.fn();

    expect(rejectInvalidPdf({ file: createPdf({ type: 'text/plain' }), addErrorToast })).toBe(true);
    expect(addErrorToast).toHaveBeenCalledWith({ title: 'Only PDF files are supported.' });
  });

  it('rejects a PDF that is too large', () => {
    const addErrorToast = jest.fn();

    expect(rejectInvalidPdf({ file: createPdf({ size: MAX_PDF_BYTES + 1 }), addErrorToast })).toBe(
      true
    );
    expect(addErrorToast).toHaveBeenCalledWith({
      title: 'PDF is too large. Maximum size is 10 MB.',
    });
  });
});

describe('rejectIfTooManyPdfs', () => {
  it('allows the first PDF', () => {
    const addErrorToast = jest.fn();

    expect(rejectIfTooManyPdfs({ currentPdfCount: 0, addErrorToast })).toBe(false);
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it('blocks a second PDF with a toast', () => {
    const addErrorToast = jest.fn();

    expect(rejectIfTooManyPdfs({ currentPdfCount: MAX_PDFS_PER_MESSAGE, addErrorToast })).toBe(
      true
    );
    expect(addErrorToast).toHaveBeenCalledWith({ title: 'You can attach 1 PDF per message.' });
  });
});

describe('uploadPdf', () => {
  const attachment = { id: 'att-1', type: 'pdf' };
  const setup = () => {
    const pdfFilesClient = {
      create: jest.fn().mockResolvedValue({ file: { id: 'file-1' } }),
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const attachmentsService = { create: jest.fn().mockResolvedValue(attachment) };
    const controller = new AbortController();
    const run = () =>
      uploadPdf({
        file: createPdf(),
        name: 'invoice.pdf',
        conversationId: 'conv-1',
        pdfFilesClient: pdfFilesClient as never,
        attachmentsService: attachmentsService as never,
        signal: controller.signal,
      });
    return { pdfFilesClient, attachmentsService, controller, run };
  };

  it('uploads the file, then creates the pdf attachment from its id', async () => {
    const { pdfFilesClient, attachmentsService, controller, run } = setup();

    await expect(run()).resolves.toEqual({ status: 'done', attachment, fileId: 'file-1' });

    expect(pdfFilesClient.create).toHaveBeenCalledWith({
      name: 'invoice.pdf',
      mimeType: 'application/pdf',
    });
    expect(pdfFilesClient.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'file-1',
        contentType: 'application/pdf',
        abortSignal: controller.signal,
        selfDestructOnAbort: true,
      })
    );
    expect(attachmentsService.create).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      type: 'pdf',
      origin: 'file-1',
      signal: controller.signal,
    });
  });

  it('fails with a plain message when the upload fails, and does not create the attachment', async () => {
    const { pdfFilesClient, attachmentsService, run } = setup();
    pdfFilesClient.upload.mockRejectedValue(new Error('network'));

    await expect(run()).resolves.toEqual({
      status: 'failed',
      message: 'Could not upload the PDF.',
    });
    expect(attachmentsService.create).not.toHaveBeenCalled();
  });

  it('shows the server message when reading the PDF fails', async () => {
    const { attachmentsService, run } = setup();
    attachmentsService.create.mockRejectedValue(new Error('The file is not a valid PDF.'));

    await expect(run()).resolves.toEqual({
      status: 'failed',
      message: 'The file is not a valid PDF.',
    });
  });

  it('reports an abort during the upload as aborted, not failed', async () => {
    const { pdfFilesClient, attachmentsService, controller, run } = setup();
    pdfFilesClient.upload.mockImplementation(async () => {
      controller.abort();
      throw new Error('aborted');
    });

    await expect(run()).resolves.toEqual({ status: 'aborted' });
    expect(attachmentsService.create).not.toHaveBeenCalled();
    expect(pdfFilesClient.delete).not.toHaveBeenCalled();
  });

  it('deletes the file itself when aborted between the upload and the read', async () => {
    const { pdfFilesClient, attachmentsService, controller, run } = setup();
    pdfFilesClient.upload.mockImplementation(async () => {
      controller.abort();
    });

    await expect(run()).resolves.toEqual({ status: 'aborted' });
    expect(pdfFilesClient.delete).toHaveBeenCalledWith({ id: 'file-1' });
    expect(attachmentsService.create).not.toHaveBeenCalled();
  });

  it('reports an abort during the read as aborted, with no toast message', async () => {
    const { attachmentsService, controller, run } = setup();
    attachmentsService.create.mockImplementation(async () => {
      controller.abort();
      throw new Error('aborted');
    });

    await expect(run()).resolves.toEqual({ status: 'aborted' });
  });
});
