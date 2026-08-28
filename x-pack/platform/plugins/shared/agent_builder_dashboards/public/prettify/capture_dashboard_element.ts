/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import domtoimage from 'dom-to-image-more';

/** Width of the raster screenshot attached to the Prettify chat. */
export const DASHBOARD_SCREENSHOT_WIDTH = 800;

const GRID_TEST_SUBJ = 'kbnGridLayout';
const RASTER_MIME_TYPES = new Set(['image/png', 'image/jpeg']);

const isReadableStylesheet = (style: CSSStyleSheet): boolean => {
  try {
    void style.cssRules;
    return true;
  } catch {
    return false;
  }
};

const contentSize = (element: HTMLElement): { width: number; height: number } => ({
  width: Math.max(
    1,
    Math.ceil(element.scrollWidth || element.offsetWidth || element.getBoundingClientRect().width)
  ),
  height: Math.max(
    1,
    Math.ceil(
      element.scrollHeight || element.offsetHeight || element.getBoundingClientRect().height
    )
  ),
});

/**
 * Dashboard chrome is viewport-sized; the grid is the full painted layout.
 * Measure both so panels below the fold are included in one screenshot.
 */
const dashboardCaptureSize = (element: HTMLElement): { width: number; height: number } => {
  const size = contentSize(element);
  const grid = element.querySelector(`[data-test-subj="${GRID_TEST_SUBJ}"]`);
  if (!(grid instanceof HTMLElement)) {
    return size;
  }
  const gridSize = contentSize(grid);
  return {
    width: Math.max(size.width, gridSize.width),
    height: Math.max(size.height, gridSize.height),
  };
};

const dataUrlToRasterBlob = (dataUrl: string): Blob => {
  const commaIndex = dataUrl.indexOf(',');
  const header = commaIndex >= 0 ? dataUrl.slice(0, commaIndex) : '';
  const data = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : '';
  const mime = header.match(/data:([^;,]+)/)?.[1];

  if (!mime || !RASTER_MIME_TYPES.has(mime)) {
    throw new Error('Failed to capture the dashboard as a PNG or JPEG');
  }

  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

const scalePngDataUrlToWidth = async (dataUrl: string, targetWidth: number): Promise<Blob> => {
  const original = dataUrlToRasterBlob(dataUrl);
  if (typeof createImageBitmap !== 'function') {
    return original;
  }

  const bitmap = await createImageBitmap(original);
  try {
    if (bitmap.width <= targetWidth) {
      return original;
    }

    const scale = targetWidth / bitmap.width;
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return original;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const scaledUrl = canvas.toDataURL('image/png');
    return dataUrlToRasterBlob(scaledUrl);
  } finally {
    bitmap.close();
  }
};

/**
 * Rasterize the painted dashboard to a single 800px-wide PNG of the full layout.
 */
export const captureDashboardElementPng = async (element: HTMLElement): Promise<Blob> => {
  const { width, height } = dashboardCaptureSize(element);

  const dataUrl = await domtoimage.toPng(element, {
    bgcolor: '#ffffff',
    cacheBust: true,
    width,
    height,
    style: {
      overflow: 'visible',
      width: `${width}px`,
      height: `${height}px`,
    },
    styleFilter: isReadableStylesheet,
  });
  if (!dataUrl) {
    throw new Error('Failed to capture the dashboard as a PNG or JPEG');
  }
  return scalePngDataUrlToWidth(dataUrl, DASHBOARD_SCREENSHOT_WIDTH);
};
