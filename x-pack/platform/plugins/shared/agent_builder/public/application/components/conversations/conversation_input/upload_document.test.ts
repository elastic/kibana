/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_DOCUMENT_BYTES } from '@kbn/agent-builder-common/attachments';
import {
  MAX_DOCUMENTS_PER_MESSAGE,
  rejectIfTooManyDocuments,
  rejectInvalidDocument,
  uploadDocument,
} from './upload_document';

jest.mock('@kbn/agent-builder-browser', () => ({
  formatAgentBuilderErrorMessage: (error: Error) => error.message,
}));

const MB = 1024 * 1024;

const createDocument = ({ name = 'invoice.pdf', type = 'application/pdf', size = 4 } = {}) =>
  new File([new Uint8Array(size)], name, { type });

describe('rejectInvalidDocument', () => {
  it('accepts a small PDF', () => {
    const addErrorToast = jest.fn();

    expect(rejectInvalidDocument({ file: createDocument(), addErrorToast })).toBe(false);
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it('accepts a Markdown file with an empty type', () => {
    const addErrorToast = jest.fn();
    const file = createDocument({ name: 'notes.md', type: '' });

    expect(rejectInvalidDocument({ file, addErrorToast })).toBe(false);
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it('accepts a PDF of exactly the maximum size', () => {
    const addErrorToast = jest.fn();
    const file = createDocument({ size: MAX_DOCUMENT_BYTES['application/pdf'] });

    expect(rejectInvalidDocument({ file, addErrorToast })).toBe(false);
  });

  it('rejects a file type that is not supported', () => {
    const addErrorToast = jest.fn();
    const file = createDocument({ name: 'data.csv', type: 'text/plain' });

    expect(rejectInvalidDocument({ file, addErrorToast })).toBe(true);
    expect(addErrorToast).toHaveBeenCalledWith({ title: 'This file type is not supported.' });
  });

  it.each([
    ['a PDF', 'invoice.pdf', 'application/pdf', 10],
    ['a Markdown file', 'notes.md', 'text/markdown', 2],
    ['a text file', 'notes.txt', 'text/plain', 2],
  ])('rejects %s that is over its own limit', (_label, name, type, limitInMb) => {
    const addErrorToast = jest.fn();
    const file = createDocument({ name, type, size: limitInMb * MB + 1 });

    expect(rejectInvalidDocument({ file, addErrorToast })).toBe(true);
    expect(addErrorToast).toHaveBeenCalledWith({
      title: `The file is too large. The maximum size is ${limitInMb} MB.`,
    });
  });

  it('uses the limit of the file type, not one limit for all', () => {
    const addErrorToast = jest.fn();

    expect(
      rejectInvalidDocument({
        file: createDocument({ name: 'notes.txt', type: 'text/plain', size: 3 * MB }),
        addErrorToast,
      })
    ).toBe(true);
    expect(rejectInvalidDocument({ file: createDocument({ size: 3 * MB }), addErrorToast })).toBe(
      false
    );
  });
});

describe('rejectIfTooManyDocuments', () => {
  it('allows the first document', () => {
    const addErrorToast = jest.fn();

    expect(rejectIfTooManyDocuments({ currentDocumentCount: 0, addErrorToast })).toBe(false);
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it('blocks a second document with a toast', () => {
    const addErrorToast = jest.fn();

    expect(
      rejectIfTooManyDocuments({ currentDocumentCount: MAX_DOCUMENTS_PER_MESSAGE, addErrorToast })
    ).toBe(true);
    expect(addErrorToast).toHaveBeenCalledWith({ title: 'You can attach 1 document per message.' });
  });
});

describe('uploadDocument', () => {
  const attachment = { id: 'att-1', type: 'document' };
  const setup = () => {
    const documentFilesClient = {
      create: jest.fn().mockResolvedValue({ file: { id: 'file-1' } }),
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const attachmentsService = { create: jest.fn().mockResolvedValue(attachment) };
    const controller = new AbortController();
    const run = () =>
      uploadDocument({
        file: createDocument(),
        name: 'invoice.pdf',
        mimeType: 'application/pdf',
        conversationId: 'conv-1',
        documentFilesClient: documentFilesClient as never,
        attachmentsService: attachmentsService as never,
        signal: controller.signal,
      });
    return { documentFilesClient, attachmentsService, controller, run };
  };

  it('uploads the file, then creates the document attachment from its id', async () => {
    const { documentFilesClient, attachmentsService, controller, run } = setup();

    await expect(run()).resolves.toEqual({ status: 'done', attachment, fileId: 'file-1' });

    expect(documentFilesClient.create).toHaveBeenCalledWith({
      name: 'invoice.pdf',
      mimeType: 'application/pdf',
    });
    expect(documentFilesClient.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'file-1',
        contentType: 'application/pdf',
        abortSignal: controller.signal,
        selfDestructOnAbort: true,
      })
    );
    expect(attachmentsService.create).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      type: 'document',
      origin: 'file-1',
      signal: controller.signal,
    });
  });

  it('uses the resolved MIME type, not the type of the file', async () => {
    const { documentFilesClient, attachmentsService, controller } = setup();

    await uploadDocument({
      file: createDocument({ name: 'notes.md', type: '' }),
      name: 'notes.md',
      mimeType: 'text/markdown',
      conversationId: 'conv-1',
      documentFilesClient: documentFilesClient as never,
      attachmentsService: attachmentsService as never,
      signal: controller.signal,
    });

    expect(documentFilesClient.create).toHaveBeenCalledWith({
      name: 'notes.md',
      mimeType: 'text/markdown',
    });
    expect(documentFilesClient.upload).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'text/markdown' })
    );
  });

  it('fails with a plain message when the upload fails, and does not create the attachment', async () => {
    const { documentFilesClient, attachmentsService, run } = setup();
    documentFilesClient.upload.mockRejectedValue(new Error('network'));

    await expect(run()).resolves.toEqual({
      status: 'failed',
      message: 'Could not upload the file.',
    });
    expect(attachmentsService.create).not.toHaveBeenCalled();
  });

  it('shows the server message when reading the document fails', async () => {
    const { attachmentsService, run } = setup();
    attachmentsService.create.mockRejectedValue(new Error('The file is not a valid PDF.'));

    await expect(run()).resolves.toEqual({
      status: 'failed',
      message: 'The file is not a valid PDF.',
    });
  });

  it('reports an abort during the upload as aborted, not failed', async () => {
    const { documentFilesClient, attachmentsService, controller, run } = setup();
    documentFilesClient.upload.mockImplementation(async () => {
      controller.abort();
      throw new Error('aborted');
    });

    await expect(run()).resolves.toEqual({ status: 'aborted' });
    expect(attachmentsService.create).not.toHaveBeenCalled();
    expect(documentFilesClient.delete).not.toHaveBeenCalled();
  });

  it('deletes the file itself when aborted between the upload and the read', async () => {
    const { documentFilesClient, attachmentsService, controller, run } = setup();
    documentFilesClient.upload.mockImplementation(async () => {
      controller.abort();
    });

    await expect(run()).resolves.toEqual({ status: 'aborted' });
    expect(documentFilesClient.delete).toHaveBeenCalledWith({ id: 'file-1' });
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
