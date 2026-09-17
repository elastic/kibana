/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import type { ToastInput } from '@kbn/core/public';
import {
  AttachmentType,
  MAX_IMAGE_BYTES,
  SUPPORTED_IMAGE_MIME_TYPES,
} from '@kbn/agent-builder-common/attachments';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';

const FORMATTED_MAX_SIZE = numeral(MAX_IMAGE_BYTES).format('0.[0] b');

const labels = {
  invalidType: i18n.translate('xpack.agentBuilder.uploadImage.invalidType', {
    defaultMessage: 'Only PNG and JPEG images are supported.',
  }),
  tooLarge: i18n.translate('xpack.agentBuilder.uploadImage.tooLarge', {
    defaultMessage: 'Image is too large. Maximum size is {maxSize}.',
    values: { maxSize: FORMATTED_MAX_SIZE },
  }),
  uploadError: i18n.translate('xpack.agentBuilder.uploadImage.uploadError', {
    defaultMessage: 'Could not upload the image.',
  }),
};

/** Returns a name that is not already in `existingNames`. Appends ` 2`, ` 3`, ... as needed. */
export const getUniqueName = (originalName: string, existingNames: Set<string>): string => {
  if (!existingNames.has(originalName)) return originalName;
  const dot = originalName.lastIndexOf('.');
  const base = dot !== -1 ? originalName.slice(0, dot) : originalName;
  const ext = dot !== -1 ? originalName.slice(dot) : '';
  let n = 2;
  while (existingNames.has(`${base} ${n}${ext}`)) n++;
  return `${base} ${n}${ext}`;
};

/**
 * Validates a File, uploads it to the Files service, and calls upsertAttachments.
 * Returns whether the attachment was created - `false` tells the caller to remove
 * the inline editor placeholder.
 */
export const processImageFile = async ({
  file,
  name,
  filesClient,
  upsertAttachments,
  addErrorToast,
  abortSignal,
}: {
  file: File;
  name: string;
  filesClient: ScopedFilesClient;
  upsertAttachments: (attachments: ConversationAttachment[]) => void;
  addErrorToast: (input: ToastInput) => void;
  abortSignal?: AbortSignal;
}): Promise<boolean> => {
  if (!(SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    addErrorToast({ title: labels.invalidType });
    return false;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    addErrorToast({ title: labels.tooLarge });
    return false;
  }

  const isRealImage = await createImageBitmap(file).then(
    (bitmap) => {
      bitmap.close();
      return true;
    },
    () => false
  );
  if (!isRealImage) {
    addErrorToast({ title: labels.invalidType });
    return false;
  }

  try {
    const { file: fileEntry } = await filesClient.create({ name, mimeType: file.type });
    await filesClient.upload({
      id: fileEntry.id,
      body: file,
      contentType: file.type,
      abortSignal,
      selfDestructOnAbort: true,
    });

    if (abortSignal?.aborted) return true;

    upsertAttachments([
      {
        type: AttachmentType.image,
        data: { file_id: fileEntry.id, name, mime_type: file.type },
      } as ConversationAttachment,
    ]);
    return true;
  } catch (err: unknown) {
    if (abortSignal?.aborted) return true;
    addErrorToast({ title: labels.uploadError });
    return false;
  }
};
