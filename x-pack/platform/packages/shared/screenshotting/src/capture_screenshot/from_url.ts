/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error - this module has no exported types
import domtoimage from 'dom-to-image-more';
import type { CaptureResult, CaptureScreenshotOptions } from '../types';
import {
  getSelectorForUrl,
  waitForSelector,
  canvasToBlob,
  waitForNoGlobalLoadingIndicator,
} from './utils';

export const captureScreenshotFromUrl = async (
  url: string,
  options: CaptureScreenshotOptions = {}
): Promise<CaptureResult | null> => {
  const { timeout = 90000, stableFor = 2000 } = options;

  const iframe = document.createElement('iframe');

  Object.assign(iframe.style, {
    position: 'absolute',
    width: '1200px',
    height: '600px',
    pointerEvents: 'none',
    visibility: 'hidden',
  });

  document.body.appendChild(iframe);

  return new Promise((resolve) => {
    const selector = getSelectorForUrl(url);

    iframe.onload = async () => {
      const element = await waitForSelector(iframe, selector, timeout);
      if (!element) {
        cleanup();
        return resolve(null);
      }

      await waitForNoGlobalLoadingIndicator(iframe.contentDocument, timeout * 2, stableFor);

      try {
        const canvas = await domtoimage.toCanvas(element);
        const image = canvas.toDataURL('image/png');
        const blob = await canvasToBlob(canvas);
        cleanup();
        resolve({ image, blob });
      } catch (err) {
        cleanup();
        resolve(null);
      }
    };

    const iframeSrc = url.includes('?')
      ? `${url}&disableIntersection=true`
      : `${url}?disableIntersection=true`;
    iframe.src = iframeSrc;

    const cleanup = () => {
      document.body.removeChild(iframe);
    };
  });
};
