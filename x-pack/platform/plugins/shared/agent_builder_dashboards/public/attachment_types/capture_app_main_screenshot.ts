/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error no types for dom-to-image-more
import domtoimage from 'dom-to-image-more';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import type {
  ImageAttachmentData,
  ImageAttachmentMediaType,
} from '@kbn/agent-builder-common/attachments';
import { IMAGE_ATTACHMENT_MAX_BASE64_LENGTH } from '@kbn/agent-builder-common/attachments';

/** Enough for layout + labels; Anthropic image tokens scale with width×height. */
const MAX_WIDTH_PX = 1024;
const JPEG_QUALITY = 0.68;
const WEBP_QUALITY = 0.72;
/**
 * Prefer PNG when it is close to the smallest lossy encode — Kibana UIs are mostly
 * flat color + sharp text, where PNG stays readable and often competitive in size.
 */
const PNG_PREFERENCE_RATIO = 1.2;

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

const canvasToBase64 = async (
  canvas: HTMLCanvasElement,
  mediaType: ImageAttachmentMediaType,
  quality?: number
): Promise<string | undefined> => {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mediaType, quality);
  });
  if (!blob) {
    return undefined;
  }
  const data = await blobToBase64(blob);
  if (data.length > IMAGE_ATTACHMENT_MAX_BASE64_LENGTH) {
    return undefined;
  }
  return data;
};

/**
 * Among valid encodings, prefer PNG when near the smallest size (crisp UI text);
 * otherwise pick the smallest payload (typically WebP/JPEG).
 */
export const pickScreenshotEncoding = (
  candidates: ImageAttachmentData[]
): ImageAttachmentData | undefined => {
  if (candidates.length === 0) {
    return undefined;
  }

  const smallest = candidates.reduce((best, current) =>
    current.data.length < best.data.length ? current : best
  );
  const png = candidates.find((candidate) => candidate.media_type === 'image/png');
  if (png && png.data.length <= smallest.data.length * PNG_PREFERENCE_RATIO) {
    return png;
  }
  return smallest;
};

const compressCaptureBlob = async (blob: Blob): Promise<ImageAttachmentData | undefined> => {
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
    // Flat white backdrop matches Kibana light UI and helps PNG/WebP compress empty space.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const encodings: Array<{
      mediaType: ImageAttachmentMediaType;
      quality?: number;
    }> = [
      { mediaType: 'image/png' },
      { mediaType: 'image/webp', quality: WEBP_QUALITY },
      { mediaType: 'image/jpeg', quality: JPEG_QUALITY },
    ];

    const candidates: ImageAttachmentData[] = [];
    for (const { mediaType, quality } of encodings) {
      const data = await canvasToBase64(canvas, mediaType, quality);
      if (data) {
        candidates.push({ media_type: mediaType, data });
      }
    }

    return pickScreenshotEncoding(candidates);
  } finally {
    bitmap.close();
  }
};

/**
 * Prefer the dashboard content node over `#app-main-scroll`.
 *
 * `#app-main-scroll` is a fixed-height overflow scroller. Capturing it (even with
 * scrollWidth/scrollHeight) still rasters the clipped viewport because cloned
 * stylesheet rules re-apply overflow + percentage height. The inner dashboard /
 * grid nodes already size to the full panel layout, so dom-to-image can serialize
 * them without that clip.
 */
export const resolveDashboardCaptureElement = (): HTMLElement | undefined => {
  const dashboardContainer = document.querySelector<HTMLElement>(
    '[data-test-subj="dashboardContainer"]'
  );
  if (dashboardContainer) {
    return dashboardContainer;
  }

  const dashboardViewport = document.querySelector<HTMLElement>(
    '[data-test-subj="dshDashboardViewport"]'
  );
  if (dashboardViewport) {
    return dashboardViewport;
  }

  const grid = document.querySelector<HTMLElement>('[data-test-subj="kbnGridLayout"]');
  if (grid) {
    return grid.closest<HTMLElement>('.kbnGridWrapper') ?? grid;
  }

  return document.getElementById(APP_MAIN_SCROLL_CONTAINER_ID) ?? undefined;
};

const measureElement = (element: HTMLElement): { width: number; height: number } => {
  const rect = element.getBoundingClientRect();
  return {
    width: Math.max(element.scrollWidth, element.offsetWidth, Math.round(rect.width), 1),
    height: Math.max(element.scrollHeight, element.offsetHeight, Math.round(rect.height), 1),
  };
};

/**
 * Captures the full dashboard (or app main content), not just the visible scroll
 * viewport, then downscales and picks PNG/WebP/JPEG.
 */
export const captureAppMainScreenshot = async (): Promise<ImageAttachmentData | undefined> => {
  const element = resolveDashboardCaptureElement();
  if (!element) {
    return undefined;
  }

  const { width, height } = measureElement(element);
  const capturingScrollContainer = element.id === APP_MAIN_SCROLL_CONTAINER_ID;

  // Only the scroll-container fallback needs live style mutation; dashboard/grid
  // nodes already have intrinsic full height.
  const previous = capturingScrollContainer
    ? {
        height: element.style.height,
        maxHeight: element.style.maxHeight,
        overflow: element.style.overflow,
        overflowY: element.style.overflowY,
      }
    : undefined;

  if (previous) {
    element.style.height = `${height}px`;
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
    element.style.overflowY = 'visible';
  }

  try {
    const blob: Blob | null = await domtoimage.toBlob(element, {
      quality: 1,
      bgcolor: '#ffffff',
      cacheBust: true,
      width,
      height,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
        width: `${width}px`,
        height: `${height}px`,
        maxHeight: 'none',
        overflow: 'visible',
        overflowY: 'visible',
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

    const compressed = await compressCaptureBlob(blob);
    if (compressed) {
      return compressed;
    }

    // Fallback when canvas compression is unavailable (e.g. some test environments).
    const pngData = await blobToBase64(blob);
    if (pngData.length > IMAGE_ATTACHMENT_MAX_BASE64_LENGTH) {
      return undefined;
    }
    return { media_type: 'image/png', data: pngData };
  } catch {
    return undefined;
  } finally {
    if (previous) {
      element.style.height = previous.height;
      element.style.maxHeight = previous.maxHeight;
      element.style.overflow = previous.overflow;
      element.style.overflowY = previous.overflowY;
    }
  }
};
