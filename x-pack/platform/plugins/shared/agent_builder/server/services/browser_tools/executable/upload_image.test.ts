/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { FilesStart } from '@kbn/files-plugin/server';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { BrowserToolImagePayload } from '@kbn/agent-builder-common';
import {
  ATTACHMENT_REF_ACTOR,
  AttachmentType,
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
} from '@kbn/agent-builder-common/attachments';
import { createAttachmentStateManagerMock } from '../../../test_utils/runner';
import { createUploadBrowserToolImage } from './upload_image';

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
const PNG_BASE64 = PNG_BYTES.toString('base64');
const TOOL_ID = 'browser.screenshot';

const readStream = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

describe('createUploadBrowserToolImage', () => {
  let uploaded: Buffer | undefined;
  let file: { id: string; uploadContent: jest.Mock; delete: jest.Mock };
  let fileService: { create: jest.Mock };
  let files: FilesStart;
  let attachments: ReturnType<typeof createAttachmentStateManagerMock>;
  const request = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    uploaded = undefined;
    file = {
      id: 'file-1',
      uploadContent: jest.fn(async (stream: Readable) => {
        uploaded = await readStream(stream);
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    fileService = { create: jest.fn().mockResolvedValue(file) };
    files = {
      fileServiceFactory: { asScoped: jest.fn(() => fileService) },
    } as unknown as FilesStart;
    attachments = createAttachmentStateManagerMock();
    attachments.add.mockResolvedValue({ id: 'attachment-1' } as any);
  });

  const upload = (image: BrowserToolImagePayload) =>
    createUploadBrowserToolImage({ files })({ image, request, attachments, toolId: TOOL_ID });

  it('stores the image as a file and an image attachment, and returns the marker', async () => {
    const result = await upload({
      mime_type: 'image/png',
      base64: PNG_BASE64,
      name: 'page.png',
      description: 'the discover page',
    });

    expect(files.fileServiceFactory.asScoped).toHaveBeenCalledWith(request);
    expect(fileService.create).toHaveBeenCalledWith({
      fileKind: CHAT_ATTACHMENT_IMAGES_FILE_KIND,
      name: 'page.png',
      mime: 'image/png',
    });
    expect(uploaded).toEqual(PNG_BYTES);
    expect(attachments.add).toHaveBeenCalledWith(
      {
        type: AttachmentType.image,
        data: { file_id: 'file-1', name: 'page.png', mime_type: 'image/png' },
        description: 'the discover page',
      },
      ATTACHMENT_REF_ACTOR.agent,
      undefined,
      { request }
    );
    expect(result).toEqual({
      tool_result_id: expect.any(String),
      type: ToolResultType.image,
      data: {
        attachment_id: 'attachment-1',
        mime_type: 'image/png',
        name: 'page.png',
        description: 'the discover page',
      },
    });
    expect(JSON.stringify(result)).not.toContain(PNG_BASE64);
    expect(file.delete).not.toHaveBeenCalled();
  });

  it('uses a default name derived from the tool id and mime type', async () => {
    const result = await upload({ mime_type: 'image/jpeg', base64: PNG_BASE64 });

    expect(fileService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: `${TOOL_ID}_screenshot.jpg` })
    );
    expect(result.data.name).toBe(`${TOOL_ID}_screenshot.jpg`);
  });

  it('uses a default description derived from the tool id when the image has none', async () => {
    const result = await upload({ mime_type: 'image/png', base64: PNG_BASE64 });

    expect(result.data.description).toBe(`Screenshot taken by ${TOOL_ID}.`);
  });

  it('strips a data URL prefix before decoding', async () => {
    await upload({ mime_type: 'image/png', base64: `data:image/png;base64,${PNG_BASE64}` });

    expect(uploaded).toEqual(PNG_BYTES);
  });

  it('rejects an unsupported mime type without creating a file', async () => {
    await expect(
      upload({ mime_type: 'image/gif' as BrowserToolImagePayload['mime_type'], base64: PNG_BASE64 })
    ).rejects.toThrow('Unsupported image mime type: image/gif');
    expect(fileService.create).not.toHaveBeenCalled();
  });

  it('rejects an empty image without creating a file', async () => {
    await expect(
      upload({ mime_type: 'image/png', base64: 'data:image/png;base64,' })
    ).rejects.toThrow('Image is empty');
    expect(fileService.create).not.toHaveBeenCalled();
  });

  it('deletes the file when the upload fails', async () => {
    file.uploadContent.mockRejectedValue(new Error('file too large'));

    await expect(upload({ mime_type: 'image/png', base64: PNG_BASE64 })).rejects.toThrow(
      'file too large'
    );
    expect(file.delete).toHaveBeenCalledTimes(1);
    expect(attachments.add).not.toHaveBeenCalled();
  });

  it('deletes the file when the attachment cannot be added', async () => {
    attachments.add.mockRejectedValue(new Error('invalid attachment'));

    await expect(upload({ mime_type: 'image/png', base64: PNG_BASE64 })).rejects.toThrow(
      'invalid attachment'
    );
    expect(file.delete).toHaveBeenCalledTimes(1);
  });
});
