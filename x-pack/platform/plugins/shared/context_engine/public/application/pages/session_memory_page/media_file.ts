/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAX_SESSION_MEMORY_MEDIA_BYTES } from '../../../../common/constants';
import type { SessionMemoryMediaItem } from '../../../../common/http_api/session_memory';

/** Raster formats the multimodal model accepts; SVG is rejected by it. */
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
const PDF_MIME_TYPE = 'application/pdf';

export const MEDIA_FILE_ACCEPT = [...IMAGE_MIME_TYPES, PDF_MIME_TYPE].join(',');

export class MediaFileError extends Error {}

const unsupportedTypeMessage = i18n.translate(
  'xpack.contextEngine.sessionMemory.media.unsupportedType',
  {
    defaultMessage: 'Only PNG, JPEG, WebP, GIF, and PDF files are supported.',
  }
);

const tooLargeMessage = i18n.translate('xpack.contextEngine.sessionMemory.media.tooLarge', {
  defaultMessage: 'The file must be under 1 MB.',
});

const toMediaType = (file: File): SessionMemoryMediaItem['type'] | undefined => {
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'image';
  }
  if (file.type === PDF_MIME_TYPE) {
    return 'pdf';
  }
  return undefined;
};

/**
 * Reads an uploaded image or PDF into a `media` item: a `data:<mime>;base64,<bytes>` URL with no
 * line breaks, the shape both the remember body and a media search query take.
 */
export const readMediaFile = (file: File): Promise<SessionMemoryMediaItem> =>
  new Promise((resolve, reject) => {
    const type = toMediaType(file);
    if (type === undefined) {
      reject(new MediaFileError(unsupportedTypeMessage));
      return;
    }
    if (file.size > MAX_SESSION_MEMORY_MEDIA_BYTES) {
      reject(new MediaFileError(tooLargeMessage));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new MediaFileError(String(reader.error?.message ?? 'read error')));
    reader.onload = () => resolve({ type, value: String(reader.result), format: 'base64' });
    reader.readAsDataURL(file);
  });

/** The first previewable image of a memory: a `data:` URL or an `https` URL. */
export const getImagePreviewSrc = (
  media: SessionMemoryMediaItem[] | undefined
): string | undefined =>
  media?.find(
    ({ type, value }) =>
      type === 'image' && (value.startsWith('data:image/') || value.startsWith('https://'))
  )?.value;
