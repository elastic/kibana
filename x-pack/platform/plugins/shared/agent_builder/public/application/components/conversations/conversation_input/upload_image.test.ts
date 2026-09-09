/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUniqueName, processImageFile } from './upload_image';
import { AttachmentType, MAX_IMAGE_BYTES } from '@kbn/agent-builder-common/attachments';

(global as unknown as { createImageBitmap: jest.Mock }).createImageBitmap = jest
  .fn()
  .mockResolvedValue({ close: jest.fn() });
const mockCreateImageBitmap = (global as unknown as { createImageBitmap: jest.Mock })
  .createImageBitmap;

describe('getUniqueName', () => {
  it('returns the original name when no collision', () => {
    expect(getUniqueName('photo.png', new Set())).toBe('photo.png');
  });

  it('appends 2 on first collision', () => {
    expect(getUniqueName('photo.png', new Set(['photo.png']))).toBe('photo 2.png');
  });

  it('finds the next free slot past existing numbered versions', () => {
    expect(getUniqueName('photo.png', new Set(['photo.png', 'photo 2.png', 'photo 3.png']))).toBe(
      'photo 4.png'
    );
  });

  it('works for files without an extension', () => {
    expect(getUniqueName('image', new Set(['image']))).toBe('image 2');
  });
});

const makeFile = (name: string, type: string, size: number): File => {
  const file = new File([new Uint8Array(size)], name, { type });
  return file;
};

const makeFilesClient = (overrides?: Record<string, unknown>) => ({
  create: jest.fn().mockResolvedValue({ file: { id: 'file-abc' } }),
  upload: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeAddErrorToast = () => jest.fn();

describe('processImageFile', () => {
  afterEach(() => {
    (global as unknown as { createImageBitmap: jest.Mock }).createImageBitmap.mockReset();
    (global as unknown as { createImageBitmap: jest.Mock }).createImageBitmap.mockResolvedValue({
      close: jest.fn(),
    });
  });

  it('calls create then upload then upsertAttachments on success', async () => {
    const filesClient = makeFilesClient();
    const upsertAttachments = jest.fn();
    const addErrorToast = makeAddErrorToast();

    const result = await processImageFile({
      file: makeFile('shot.png', 'image/png', 100),
      name: 'shot.png',
      filesClient: filesClient as never,
      upsertAttachments,
      addErrorToast,
    });

    expect(filesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'shot.png', mimeType: 'image/png' })
    );
    expect(filesClient.upload).toHaveBeenCalledWith(expect.objectContaining({ id: 'file-abc' }));
    expect(upsertAttachments).toHaveBeenCalledWith([
      {
        type: AttachmentType.image,
        data: { file_id: 'file-abc', name: 'shot.png', mime_type: 'image/png' },
      },
    ]);
    expect(addErrorToast).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('shows an error toast and returns false when the file does not actually decode as an image', async () => {
    (global as unknown as { createImageBitmap: jest.Mock }).createImageBitmap.mockRejectedValue(
      new Error('not an image')
    );
    const filesClient = makeFilesClient();
    const upsertAttachments = jest.fn();
    const addErrorToast = makeAddErrorToast();

    const result = await processImageFile({
      file: makeFile('video.jpg', 'image/jpeg', 100),
      name: 'video.jpg',
      filesClient: filesClient as never,
      upsertAttachments,
      addErrorToast,
    });

    expect(filesClient.create).not.toHaveBeenCalled();
    expect(upsertAttachments).not.toHaveBeenCalled();
    expect(addErrorToast).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });

  it('shows an error toast and skips upload for unsupported mime type', async () => {
    const filesClient = makeFilesClient();
    const upsertAttachments = jest.fn();
    const addErrorToast = makeAddErrorToast();

    const result = await processImageFile({
      file: makeFile('image.gif', 'image/gif', 100),
      name: 'image.gif',
      filesClient: filesClient as never,
      upsertAttachments,
      addErrorToast,
    });

    expect(filesClient.create).not.toHaveBeenCalled();
    expect(upsertAttachments).not.toHaveBeenCalled();
    expect(addErrorToast).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });

  it('shows an error toast and skips upload when file is too large', async () => {
    const filesClient = makeFilesClient();
    const upsertAttachments = jest.fn();
    const addErrorToast = makeAddErrorToast();

    const result = await processImageFile({
      file: makeFile('big.png', 'image/png', MAX_IMAGE_BYTES + 1),
      name: 'big.png',
      filesClient: filesClient as never,
      upsertAttachments,
      addErrorToast,
    });

    expect(filesClient.create).not.toHaveBeenCalled();
    expect(upsertAttachments).not.toHaveBeenCalled();
    expect(addErrorToast).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
    expect(mockCreateImageBitmap).not.toHaveBeenCalled();
  });

  it('skips upsertAttachments and does not toast when aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const filesClient = makeFilesClient({
      create: jest.fn().mockResolvedValue({ file: { id: 'file-xyz' } }),
      upload: jest.fn().mockImplementation(() => {
        const err = new DOMException('aborted', 'AbortError');
        return Promise.reject(err);
      }),
    });
    const upsertAttachments = jest.fn();
    const addErrorToast = makeAddErrorToast();

    const result = await processImageFile({
      file: makeFile('shot.png', 'image/png', 100),
      name: 'shot.png',
      filesClient: filesClient as never,
      upsertAttachments,
      addErrorToast,
      abortSignal: controller.signal,
    });

    expect(upsertAttachments).not.toHaveBeenCalled();
    expect(addErrorToast).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('shows an error toast when upload rejects for a non-abort reason', async () => {
    const filesClient = makeFilesClient({
      create: jest.fn().mockResolvedValue({ file: { id: 'file-xyz' } }),
      upload: jest.fn().mockRejectedValue(new Error('network error')),
    });
    const upsertAttachments = jest.fn();
    const addErrorToast = makeAddErrorToast();

    const result = await processImageFile({
      file: makeFile('shot.png', 'image/png', 100),
      name: 'shot.png',
      filesClient: filesClient as never,
      upsertAttachments,
      addErrorToast,
    });

    expect(upsertAttachments).not.toHaveBeenCalled();
    expect(addErrorToast).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });
});
