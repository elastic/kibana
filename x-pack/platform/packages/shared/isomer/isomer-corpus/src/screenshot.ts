/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PNG } from 'pngjs';

export interface CssRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crops a viewport screenshot to an element's box. `rect` is in CSS pixels, as
 * `getBoundingClientRect` reports it; `scale` is screenshot pixels per CSS pixel (the device pixel
 * ratio). The box is clamped to the screenshot, so a partly visible element yields its visible part.
 */
export const cropScreenshot = (screenshot: PNG, rect: CssRect, scale: number): Buffer => {
  const left = Math.max(0, Math.round(rect.x * scale));
  const top = Math.max(0, Math.round(rect.y * scale));
  const right = Math.min(screenshot.width, Math.round((rect.x + rect.width) * scale));
  const bottom = Math.min(screenshot.height, Math.round((rect.y + rect.height) * scale));
  if (right <= left || bottom <= top) {
    throw new Error(`The element is outside the screenshot: ${JSON.stringify(rect)}`);
  }

  const cropped = new PNG({ width: right - left, height: bottom - top });
  PNG.bitblt(screenshot, cropped, left, top, right - left, bottom - top, 0, 0);
  return PNG.sync.write(cropped);
};
