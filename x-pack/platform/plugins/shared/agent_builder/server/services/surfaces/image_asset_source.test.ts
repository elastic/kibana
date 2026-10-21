/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { CHAT_ATTACHMENT_IMAGES_FILE_KIND } from '@kbn/agent-builder-common/attachments';
import type { ImageNode } from '@kbn/agent-builder-server/attachments';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { FilesStart } from '@kbn/files-plugin/server';
import { createImageAssetSource } from './image_asset_source';

const request = httpServerMock.createKibanaRequest();

const createFiles = (data: Record<string, unknown> = {}) => {
  const downloadContent = jest.fn(async () => Readable.from(Buffer.from('png')));
  const getById = jest.fn(async () => ({
    downloadContent,
    data: {
      fileKind: CHAT_ATTACHMENT_IMAGES_FILE_KIND,
      name: 'chart',
      extension: 'png',
      mimeType: 'image/png',
      size: 3,
      ...data,
    },
  }));
  const asScoped = jest.fn(() => ({ getById }));
  const files = { fileServiceFactory: { asScoped } } as unknown as FilesStart;
  return { files, asScoped, getById, downloadContent };
};

const image: ImageNode = { type: 'image', fileId: 'file-1', alt: 'A chart' };

const load = (files: FilesStart, maxBytes = 100) =>
  createImageAssetSource({ getFiles: () => files }).load(image, {
    request,
    spaceId: 'default',
    maxBytes,
  });

describe('createImageAssetSource', () => {
  it('reads the file from the Files plugin as the scoped user', async () => {
    const { files, asScoped, getById } = createFiles();

    expect(await load(files)).toEqual({
      data: Buffer.from('png'),
      mimeType: 'image/png',
      filename: 'chart.png',
    });
    expect(asScoped).toHaveBeenCalledWith(request);
    expect(getById).toHaveBeenCalledWith({ id: 'file-1' });
  });

  it('keeps a name that already has its extension', async () => {
    const { files } = createFiles({ name: 'chart.png' });

    expect(await load(files)).toEqual(expect.objectContaining({ filename: 'chart.png' }));
  });

  it('refuses files that aren’t chat attachment images', async () => {
    const { files, downloadContent } = createFiles({ fileKind: 'cases' });

    await expect(load(files)).rejects.toThrow('file kind "cases" can\'t be sent to Slack');
    expect(downloadContent).not.toHaveBeenCalled();
  });

  it('refuses a file larger than the bytes left, before reading it', async () => {
    const { files, downloadContent } = createFiles({ size: 101 });

    await expect(load(files)).rejects.toThrow('101 bytes is more than the 100 left');
    expect(downloadContent).not.toHaveBeenCalled();
  });

  it('rejects when the file is missing', async () => {
    const { files, getById } = createFiles();
    getById.mockRejectedValueOnce(new Error('File not found'));

    await expect(load(files)).rejects.toThrow('File not found');
  });
});
