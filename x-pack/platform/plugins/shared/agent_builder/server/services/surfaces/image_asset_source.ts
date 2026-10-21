/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { CHAT_ATTACHMENT_IMAGES_FILE_KIND } from '@kbn/agent-builder-common/attachments';
import type { ImageNode } from '@kbn/agent-builder-server/attachments';
import type { FilesStart } from '@kbn/files-plugin/server';
import type { SlackAssetSource } from './slack_assets';

const isImageNode = (node: PrimitiveNode): node is ImageNode =>
  node.type === 'image' && typeof (node as Partial<ImageNode>).fileId === 'string';

const streamToBuffer = (stream: Readable): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

/**
 * Loads `image` nodes' files from the Files plugin, as the user the payload renders for. Only chat
 * attachment images can be loaded, so a composition can't send any other file to Slack.
 */
export const createImageAssetSource = ({
  getFiles,
}: {
  getFiles: () => FilesStart;
}): SlackAssetSource => ({
  nodeType: 'image',
  load: async (node, { request, maxBytes }) => {
    if (!isImageNode(node)) {
      throw new Error('not an image node');
    }

    const file = await getFiles().fileServiceFactory.asScoped(request).getById({ id: node.fileId });
    const { fileKind, size, mimeType, name, extension } = file.data;

    if (fileKind !== CHAT_ATTACHMENT_IMAGES_FILE_KIND) {
      throw new Error(`file kind "${fileKind}" can't be sent to Slack`);
    }

    if (size !== undefined && size > maxBytes) {
      throw new Error(`${size} bytes is more than the ${maxBytes} left`);
    }

    return {
      data: await streamToBuffer(await file.downloadContent()),
      mimeType: mimeType ?? 'application/octet-stream',
      filename: extension && !name.endsWith(`.${extension}`) ? `${name}.${extension}` : name,
    };
  },
});
