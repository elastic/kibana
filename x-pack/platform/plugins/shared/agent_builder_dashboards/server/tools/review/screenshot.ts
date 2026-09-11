/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import {
  AttachmentType,
  getLatestVersion,
  imageAttachmentDataSchema,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { FilesStart } from '@kbn/files-plugin/server';
import { getErrorMessage } from '../generate/core';

export interface LoadedScreenshot {
  base64: string;
  mimeType: string;
}

export type ScreenshotLoadResult =
  | { status: 'loaded'; screenshot: LoadedScreenshot }
  | { status: 'unavailable'; reason: string };

export type GetFilesStart = () => Promise<FilesStart>;

const streamToBuffer = (stream: Readable): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

/**
 * Loads an image attachment from the conversation into base64 for the review
 * model. The image lives in the Files plugin; the attachment only carries its
 * file id. Failures are reported, not thrown, so the review can proceed as a
 * configuration-only review.
 */
export const loadScreenshotAttachment = async ({
  attachments,
  attachmentId,
  getFilesStart,
}: {
  attachments: AttachmentStateManager;
  attachmentId: string;
  getFilesStart: GetFilesStart;
}): Promise<ScreenshotLoadResult> => {
  const record = attachments.getAttachmentRecord(attachmentId);
  if (!record) {
    return { status: 'unavailable', reason: `Screenshot attachment "${attachmentId}" not found.` };
  }
  if (record.type !== AttachmentType.image) {
    return {
      status: 'unavailable',
      reason: `Attachment "${attachmentId}" is a "${record.type}" attachment, not an image.`,
    };
  }

  const latest = getLatestVersion(record);
  const parsed = imageAttachmentDataSchema.safeParse(latest?.data);
  if (!parsed.success) {
    return {
      status: 'unavailable',
      reason: `Screenshot attachment "${attachmentId}" has no readable image data.`,
    };
  }

  try {
    const files = await getFilesStart();
    const file = await files.fileServiceFactory.asInternal().getById({ id: parsed.data.file_id });
    const buffer = await streamToBuffer(await file.downloadContent());
    return {
      status: 'loaded',
      screenshot: { base64: buffer.toString('base64'), mimeType: parsed.data.mime_type },
    };
  } catch (error) {
    return {
      status: 'unavailable',
      reason: `Screenshot attachment "${attachmentId}" could not be loaded: ${getErrorMessage(
        error
      )}`,
    };
  }
};
