/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error no types for dom-to-image-more
import domtoimage from 'dom-to-image-more';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import type { ImageAttachmentData } from '@kbn/agent-builder-common/attachments';
import { IMAGE_ATTACHMENT_MAX_BASE64_LENGTH } from '@kbn/agent-builder-common/attachments';

const MAX_WIDTH_PX = 1280;
const JPEG_QUALITY = 0.72;

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read blob as data URL'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
};

const compressBlobToJpegBase64 = async (blob: Blob): Promise<string | undefined> => {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return undefined;
  }

  const bitmap = await createImageBitmap(blob);
  try {
    const scale = bitmap.width > MAX_WIDTH_PX ? MAX_WIDTH_PX / bitmap.width : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return undefined;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
    });
    if (!jpegBlob) {
      return undefined;
    }
    return blobToBase64(jpegBlob);
  } finally {
    bitmap.close();
  }
};

/**
 * Captures `#app-main-scroll` as a compressed JPEG (fallback PNG) for chat attachment.
 * Returns undefined when the element is missing or capture fails.
 */
export const captureAppMainScreenshot = async (): Promise<ImageAttachmentData | undefined> => {
  const element = document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID);
  if (!element) {
    return undefined;
  }

  try {
    const scale = 1;
    const blob: Blob | null = await domtoimage.toBlob(element, {
      quality: 1,
      bgcolor: '#ffffff',
      cacheBust: true,
      width: element.offsetWidth * scale,
      height: element.offsetHeight * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${element.offsetWidth}px`,
        height: `${element.offsetHeight}px`,
      },
      styleFilter: (style: CSSStyleSheet) => {
        try {
          void style.cssRules;
          return true;
        } catch {
          return false;
        }
      },
    });

    if (!blob) {
      return undefined;
    }

    const jpegData = await compressBlobToJpegBase64(blob);
    if (jpegData && jpegData.length <= IMAGE_ATTACHMENT_MAX_BASE64_LENGTH) {
      return { media_type: 'image/jpeg', data: jpegData };
    }

    const pngData = await blobToBase64(blob);
    if (pngData.length > IMAGE_ATTACHMENT_MAX_BASE64_LENGTH) {
      return undefined;
    }
    return { media_type: 'image/png', data: pngData };
  } catch {
    return undefined;
  }
};
