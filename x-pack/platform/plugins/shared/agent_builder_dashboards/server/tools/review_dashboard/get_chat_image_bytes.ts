/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import type { FilesStart } from '@kbn/files-plugin/server';

export type GetImageBytes = (fileId: string) => Promise<Buffer>;

const streamToBuffer = (stream: Readable): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

export const getChatImageBytes = async (files: FilesStart, fileId: string): Promise<Buffer> => {
  const fileService = files.fileServiceFactory.asInternal();
  const file = await fileService.getById({ id: fileId });
  const readable = await file.downloadContent();
  return streamToBuffer(readable);
};
