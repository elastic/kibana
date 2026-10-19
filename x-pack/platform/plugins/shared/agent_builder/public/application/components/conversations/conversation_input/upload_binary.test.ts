/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uploadBinary } from './upload_binary';

jest.mock('@kbn/agent-builder-browser', () => ({
  formatAgentBuilderErrorMessage: (error: Error) => error.message,
}));

const createDocument = ({ name = 'invoice.pdf', type = 'application/pdf', size = 4 } = {}) =>
  new File([new Uint8Array(size)], name, { type });

describe('uploadBinary', () => {
  const attachment = { id: 'att-1', type: 'binary' };
  const setup = () => {
    const binaryFilesClient = {
      create: jest.fn().mockResolvedValue({ file: { id: 'file-1' } }),
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const attachmentsService = { create: jest.fn().mockResolvedValue(attachment) };
    const controller = new AbortController();
    const run = () =>
      uploadBinary({
        file: createDocument(),
        name: 'invoice.pdf',
        mimeType: 'application/pdf',
        conversationId: 'conv-1',
        binaryFilesClient: binaryFilesClient as never,
        attachmentsService: attachmentsService as never,
        signal: controller.signal,
      });
    return { binaryFilesClient, attachmentsService, controller, run };
  };

  it('uploads the file, then creates the binary attachment from its id', async () => {
    const { binaryFilesClient, attachmentsService, controller, run } = setup();

    await expect(run()).resolves.toEqual({ status: 'done', attachment, fileId: 'file-1' });

    expect(binaryFilesClient.create).toHaveBeenCalledWith({
      name: 'invoice.pdf',
      mimeType: 'application/pdf',
    });
    expect(binaryFilesClient.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'file-1',
        contentType: 'application/pdf',
        abortSignal: controller.signal,
        selfDestructOnAbort: true,
      })
    );
    expect(attachmentsService.create).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      type: 'binary',
      origin: 'file-1',
      signal: controller.signal,
    });
  });

  it('uses the resolved MIME type, not the type of the file', async () => {
    const { binaryFilesClient, attachmentsService, controller } = setup();

    await uploadBinary({
      file: createDocument({ name: 'invoice.pdf', type: '' }),
      name: 'invoice.pdf',
      mimeType: 'application/pdf',
      conversationId: 'conv-1',
      binaryFilesClient: binaryFilesClient as never,
      attachmentsService: attachmentsService as never,
      signal: controller.signal,
    });

    expect(binaryFilesClient.create).toHaveBeenCalledWith({
      name: 'invoice.pdf',
      mimeType: 'application/pdf',
    });
    expect(binaryFilesClient.upload).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'application/pdf' })
    );
  });

  it('fails with a plain message when the upload fails, and does not create the attachment', async () => {
    const { binaryFilesClient, attachmentsService, run } = setup();
    binaryFilesClient.upload.mockRejectedValue(new Error('network'));

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
    const { binaryFilesClient, attachmentsService, controller, run } = setup();
    binaryFilesClient.upload.mockImplementation(async () => {
      controller.abort();
      throw new Error('aborted');
    });

    await expect(run()).resolves.toEqual({ status: 'aborted' });
    expect(attachmentsService.create).not.toHaveBeenCalled();
    expect(binaryFilesClient.delete).not.toHaveBeenCalled();
  });

  it('deletes the file itself when aborted between the upload and the read', async () => {
    const { binaryFilesClient, attachmentsService, controller, run } = setup();
    binaryFilesClient.upload.mockImplementation(async () => {
      controller.abort();
    });

    await expect(run()).resolves.toEqual({ status: 'aborted' });
    expect(binaryFilesClient.delete).toHaveBeenCalledWith({ id: 'file-1' });
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
