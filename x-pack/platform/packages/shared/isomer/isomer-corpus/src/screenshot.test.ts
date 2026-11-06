/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PNG } from 'pngjs';
import { cropScreenshot } from './screenshot';

/** A screenshot whose red channel is the column and green channel the row of each pixel. */
const createScreenshot = (width: number, height: number): PNG => {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      png.data[offset] = x;
      png.data[offset + 1] = y;
      png.data[offset + 3] = 255;
    }
  }
  return png;
};

const pixel = (png: PNG, x: number, y: number) => {
  const offset = (y * png.width + x) * 4;
  return [png.data[offset], png.data[offset + 1]];
};

describe('cropScreenshot', () => {
  it('crops a CSS-pixel box, scaled to screenshot pixels', () => {
    const cropped = PNG.sync.read(
      cropScreenshot(createScreenshot(100, 80), { x: 10, y: 5, width: 20, height: 10 }, 2)
    );
    expect([cropped.width, cropped.height]).toEqual([40, 20]);
    expect(pixel(cropped, 0, 0)).toEqual([20, 10]);
    expect(pixel(cropped, 39, 19)).toEqual([59, 29]);
  });

  it('clamps a box that is partly outside the screenshot', () => {
    const cropped = PNG.sync.read(
      cropScreenshot(createScreenshot(100, 80), { x: 90, y: -10, width: 20, height: 30 }, 1)
    );
    expect([cropped.width, cropped.height]).toEqual([10, 20]);
    expect(pixel(cropped, 0, 0)).toEqual([90, 0]);
  });

  it('throws for a box outside the screenshot', () => {
    expect(() =>
      cropScreenshot(createScreenshot(10, 10), { x: 20, y: 0, width: 5, height: 5 }, 1)
    ).toThrow('outside the screenshot');
  });
});
