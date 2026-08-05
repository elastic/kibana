/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error - this module has no exported types
import domtoimage from 'dom-to-image-more';

/**
 * Keep in sync with the image attachment schema cap (3M chars) minus JSON envelope headroom.
 */
const MAX_DATA_URL_CHARS = 2_700_000;

/**
 * Quality/scale ladder, tried in order until the encoded image fits the size budget.
 */
const ENCODE_ATTEMPTS: Array<{ scale: number; quality: number }> = [
  { scale: 1, quality: 0.8 },
  { scale: 1, quality: 0.6 },
  { scale: 0.75, quality: 0.6 },
  { scale: 0.75, quality: 0.5 },
  { scale: 0.5, quality: 0.5 },
];

/**
 * Encodes a DOM node as a JPEG data URL, stepping down quality and scale until the
 * result fits the attachment size budget. The `styleFilter` / `cacheBust` options work
 * around dom-to-image failing on cross-origin stylesheets and stale image caches.
 */
export const captureNodeAsJpeg = async (node: HTMLElement): Promise<string> => {
  const width = node.scrollWidth;
  const height = node.scrollHeight;
  if (width === 0 || height === 0) {
    throw new Error('The rendered dashboard has no visible size; nothing to capture.');
  }

  for (const { scale, quality } of ENCODE_ATTEMPTS) {
    const dataUrl: string = await domtoimage.toJpeg(node, {
      quality,
      bgcolor: '#ffffff',
      cacheBust: true,
      width: width * scale,
      height: height * scale,
      style: {
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${width}px`,
        height: `${height}px`,
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
    if (dataUrl.length <= MAX_DATA_URL_CHARS) {
      return dataUrl;
    }
  }

  throw new Error(
    `The dashboard screenshot exceeds the ${MAX_DATA_URL_CHARS} character budget even at the lowest quality; the dashboard is likely too tall to capture.`
  );
};
