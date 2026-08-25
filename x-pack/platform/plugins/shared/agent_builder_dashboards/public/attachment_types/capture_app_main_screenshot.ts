/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error no types for dom-to-image-more
import domtoimage from 'dom-to-image-more';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import {
  MAX_IMAGE_BYTES,
  type SupportedImageMimeType,
} from '@kbn/agent-builder-common/attachments';

/** Enough for layout + labels; Anthropic image tokens scale with width×height. */
const MAX_WIDTH_PX = 1024;
const JPEG_QUALITY = 0.68;
/**
 * Prefer PNG when it is close to the smallest lossy encode — Kibana UIs are mostly
 * flat color + sharp text, where PNG stays readable and often competitive in size.
 */
const PNG_PREFERENCE_RATIO = 1.2;

const MAX_BASE64_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3);

export interface ScreenshotEncodingCandidate {
  mimeType: SupportedImageMimeType;
  data: string;
}

export interface CapturedScreenshot {
  mimeType: SupportedImageMimeType;
  blob: Blob;
  name: string;
}

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

const base64ToBlob = (data: string, mimeType: SupportedImageMimeType): Blob => {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

const canvasToBase64 = async (
  canvas: HTMLCanvasElement,
  mimeType: SupportedImageMimeType,
  quality?: number
): Promise<string | undefined> => {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
  if (!blob) {
    return undefined;
  }
  const data = await blobToBase64(blob);
  if (data.length > MAX_BASE64_LENGTH) {
    return undefined;
  }
  return data;
};

/**
 * Among valid encodings, prefer PNG when near the smallest size (crisp UI text);
 * otherwise pick the smallest payload (typically JPEG).
 */
export const pickScreenshotEncoding = (
  candidates: ScreenshotEncodingCandidate[]
): ScreenshotEncodingCandidate | undefined => {
  if (candidates.length === 0) {
    return undefined;
  }

  const smallest = candidates.reduce((best, current) =>
    current.data.length < best.data.length ? current : best
  );
  const png = candidates.find((candidate) => candidate.mimeType === 'image/png');
  if (png && png.data.length <= smallest.data.length * PNG_PREFERENCE_RATIO) {
    return png;
  }
  return smallest;
};

const toCapturedScreenshot = (
  candidate: ScreenshotEncodingCandidate
): CapturedScreenshot | undefined => {
  const blob = base64ToBlob(candidate.data, candidate.mimeType);
  if (blob.size > MAX_IMAGE_BYTES) {
    return undefined;
  }
  const extension = candidate.mimeType === 'image/jpeg' ? 'jpg' : 'png';
  return {
    mimeType: candidate.mimeType,
    blob,
    name: `dashboard-screenshot.${extension}`,
  };
};

const compressCaptureBlob = async (blob: Blob): Promise<CapturedScreenshot | undefined> => {
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
    // Flat white backdrop matches Kibana light UI and helps PNG compress empty space.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const encodings: Array<{
      mimeType: SupportedImageMimeType;
      quality?: number;
    }> = [{ mimeType: 'image/png' }, { mimeType: 'image/jpeg', quality: JPEG_QUALITY }];

    const candidates: ScreenshotEncodingCandidate[] = [];
    for (const { mimeType, quality } of encodings) {
      const data = await canvasToBase64(canvas, mimeType, quality);
      if (data) {
        candidates.push({ mimeType, data });
      }
    }

    const picked = pickScreenshotEncoding(candidates);
    return picked ? toCapturedScreenshot(picked) : undefined;
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
 * viewport, then downscales and picks PNG/JPEG for the Files image pipeline.
 */
export const captureAppMainScreenshot = async (): Promise<CapturedScreenshot | undefined> => {
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
    if (pngData.length > MAX_BASE64_LENGTH) {
      return undefined;
    }
    return toCapturedScreenshot({ mimeType: 'image/png', data: pngData });
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
