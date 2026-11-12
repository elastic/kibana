/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uploadBinary } from './upload_binary';

const createDocument = ({ name = 'invoice.pdf', type = 'application/pdf', size = 4 } = {}) =>
  new File([new Uint8Array(size)], name, { type });

describe('uploadBinary', () => {
  const setup = () => {
    const binaryFilesClient = {
      create: jest.fn().mockResolvedValue({ file: { id: 'file-1' } }),
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new AbortController();
    const run = (file = createDocument()) =>
      uploadBinary({
        file,
        name: 'invoice.pdf',
        mimeType: 'application/pdf',
        binaryFilesClient: binaryFilesClient as never,
        signal: controller.signal,
      });
    return { binaryFilesClient, controller, run };
  };

  it('uploads the file and returns its id', async () => {
    const { binaryFilesClient, controller, run } = setup();

    await expect(run()).resolves.toEqual({ status: 'done', fileId: 'file-1' });

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
    expect(binaryFilesClient.delete).not.toHaveBeenCalled();
  });

  it('uses the resolved MIME type, not the type of the file', async () => {
    const { binaryFilesClient, run } = setup();

    await run(createDocument({ type: '' }));

    expect(binaryFilesClient.create).toHaveBeenCalledWith({
      name: 'invoice.pdf',
      mimeType: 'application/pdf',
    });
    expect(binaryFilesClient.upload).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'application/pdf' })
    );
  });

  it('fails with a plain message when the upload fails', async () => {
    const { binaryFilesClient, run } = setup();
    binaryFilesClient.upload.mockRejectedValue(new Error('network'));

    await expect(run()).resolves.toEqual({
      status: 'failed',
      message: 'Could not upload the file.',
    });
  });

  it('fails with a plain message when creating the file fails', async () => {
    const { binaryFilesClient, run } = setup();
    binaryFilesClient.create.mockRejectedValue(new Error('network'));

    await expect(run()).resolves.toEqual({
      status: 'failed',
      message: 'Could not upload the file.',
    });
    expect(binaryFilesClient.upload).not.toHaveBeenCalled();
  });

  it('reports an abort during the upload as aborted, not failed', async () => {
    const { binaryFilesClient, controller, run } = setup();
    binaryFilesClient.upload.mockImplementation(async () => {
      controller.abort();
      throw new Error('aborted');
    });

    await expect(run()).resolves.toEqual({ status: 'aborted' });
    // Files deletes a half-uploaded file itself (`selfDestructOnAbort`).
    expect(binaryFilesClient.delete).not.toHaveBeenCalled();
  });

  it('deletes the file itself when aborted right after the upload', async () => {
    const { binaryFilesClient, controller, run } = setup();
    binaryFilesClient.upload.mockImplementation(async () => {
      controller.abort();
    });

    await expect(run()).resolves.toEqual({ status: 'aborted' });
    expect(binaryFilesClient.delete).toHaveBeenCalledWith({ id: 'file-1' });
  });
});
