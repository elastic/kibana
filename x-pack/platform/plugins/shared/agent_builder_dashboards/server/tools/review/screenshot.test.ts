/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { loadScreenshotAttachment } from './screenshot';

const imageRecord = {
  id: 'shot',
  type: 'image',
  current_version: 1,
  versions: [{ version: 1, data: { file_id: 'file-1', name: 'shot.png', mime_type: 'image/png' } }],
};

const createAttachments = (record: unknown): AttachmentStateManager =>
  ({ getAttachmentRecord: jest.fn().mockReturnValue(record) } as unknown as AttachmentStateManager);

const createFiles = (getById: jest.Mock) => async () =>
  ({ fileServiceFactory: { asInternal: () => ({ getById }) } } as never);

describe('loadScreenshotAttachment', () => {
  it('loads the image bytes from the files plugin as base64', async () => {
    const getById = jest.fn().mockResolvedValue({
      downloadContent: async () => Readable.from([Buffer.from('abc')]),
    });

    const result = await loadScreenshotAttachment({
      attachments: createAttachments(imageRecord),
      attachmentId: 'shot',
      getFilesStart: createFiles(getById),
    });

    expect(getById).toHaveBeenCalledWith({ id: 'file-1' });
    expect(result).toEqual({
      status: 'loaded',
      screenshot: { base64: Buffer.from('abc').toString('base64'), mimeType: 'image/png' },
    });
  });

  it('reports a missing attachment', async () => {
    const result = await loadScreenshotAttachment({
      attachments: createAttachments(undefined),
      attachmentId: 'nope',
      getFilesStart: createFiles(jest.fn()),
    });
    expect(result).toEqual({ status: 'unavailable', reason: expect.stringContaining('not found') });
  });

  it('reports an attachment that is not an image', async () => {
    const result = await loadScreenshotAttachment({
      attachments: createAttachments({ ...imageRecord, type: 'dashboard' }),
      attachmentId: 'shot',
      getFilesStart: createFiles(jest.fn()),
    });
    expect(result).toEqual({
      status: 'unavailable',
      reason: expect.stringContaining('not an image'),
    });
  });

  it('reports a download failure instead of throwing', async () => {
    const getById = jest.fn().mockRejectedValue(new Error('boom'));
    const result = await loadScreenshotAttachment({
      attachments: createAttachments(imageRecord),
      attachmentId: 'shot',
      getFilesStart: createFiles(getById),
    });
    expect(result).toEqual({ status: 'unavailable', reason: expect.stringContaining('boom') });
  });
});
