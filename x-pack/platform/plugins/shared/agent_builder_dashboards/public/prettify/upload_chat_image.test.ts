/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_IMAGE_BYTES } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_PRETTIFY_IMAGE_NAME,
  uploadChatImage,
} from './upload_chat_image';

describe('uploadChatImage', () => {
  const filesClient = {
    create: jest.fn(),
    upload: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    filesClient.create.mockReset().mockResolvedValue({ file: { id: 'file-1' } });
    filesClient.upload.mockReset().mockResolvedValue({ ok: true, size: 12 });
    filesClient.delete.mockReset().mockResolvedValue({ ok: true });
  });

  it('creates and uploads a PNG, then returns image attachment data', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });

    await expect(uploadChatImage({ filesClient, blob })).resolves.toEqual({
      file_id: 'file-1',
      name: DASHBOARD_PRETTIFY_IMAGE_NAME,
      mime_type: 'image/png',
    });

    expect(filesClient.create).toHaveBeenCalledWith({
      name: DASHBOARD_PRETTIFY_IMAGE_NAME,
      mimeType: 'image/png',
    });
    expect(filesClient.upload).toHaveBeenCalledWith({
      id: 'file-1',
      body: blob,
      contentType: 'image/png',
    });
  });

  it('rejects screenshots over the chat image size limit', async () => {
    const blob = { size: MAX_IMAGE_BYTES + 1, type: 'image/png' } as Blob;

    await expect(uploadChatImage({ filesClient, blob })).rejects.toThrow(/at most/);
    expect(filesClient.create).not.toHaveBeenCalled();
  });

  it('deletes the file if upload fails', async () => {
    filesClient.upload.mockRejectedValue(new Error('upload failed'));
    const blob = new Blob(['png'], { type: 'image/png' });

    await expect(uploadChatImage({ filesClient, blob })).rejects.toThrow('upload failed');
    expect(filesClient.delete).toHaveBeenCalledWith({ id: 'file-1' });
  });
});
