/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CHAT_ATTACHMENT_IMAGES_FILE_KIND } from '@kbn/agent-builder-common/attachments';
import type { FilesStart } from '@kbn/files-plugin/public';
import { uploadChatImage } from './upload_chat_image';

describe('uploadChatImage', () => {
  it('creates a chat-attachment-images file then uploads the blob', async () => {
    const create = jest.fn().mockResolvedValue({ file: { id: 'file-1' } });
    const upload = jest.fn().mockResolvedValue({ ok: true, size: 12 });
    const files = {
      filesClientFactory: {
        asScoped: jest.fn().mockReturnValue({ create, upload }),
      },
    } as unknown as FilesStart;
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

    await expect(
      uploadChatImage({
        files,
        blob,
        name: 'dashboard-screenshot.png',
        mimeType: 'image/png',
      })
    ).resolves.toEqual({
      file_id: 'file-1',
      name: 'dashboard-screenshot.png',
      mime_type: 'image/png',
    });

    expect(files.filesClientFactory.asScoped).toHaveBeenCalledWith(
      CHAT_ATTACHMENT_IMAGES_FILE_KIND
    );
    expect(create).toHaveBeenCalledWith({
      name: 'dashboard-screenshot.png',
      mimeType: 'image/png',
    });
    expect(upload).toHaveBeenCalledWith({
      id: 'file-1',
      body: blob,
      contentType: 'image/png',
    });
  });
});
