/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { downscaleCanvas } from './downscale';

const fakeCanvas = (width: number, height: number) => {
  const drawImage = jest.fn();
  const canvas = { width, height, getContext: () => ({ drawImage }) };
  return { canvas: canvas as unknown as HTMLCanvasElement, drawImage };
};

describe('downscaleCanvas', () => {
  it('returns the same canvas when it fits', () => {
    const { canvas } = fakeCanvas(800, 600);
    expect(downscaleCanvas(canvas, 1568)).toBe(canvas);
  });

  it('never upscales', () => {
    const { canvas } = fakeCanvas(100, 50);
    expect(downscaleCanvas(canvas, 1568)).toBe(canvas);
  });

  it('keeps the aspect ratio when shrinking', () => {
    const source = fakeCanvas(3136, 1568);
    const target = fakeCanvas(0, 0);
    const result = downscaleCanvas(source.canvas, 1568, () => target.canvas);
    expect(result).toBe(target.canvas);
    expect(result.width).toBe(1568);
    expect(result.height).toBe(784);
    expect(target.drawImage).toHaveBeenCalledWith(source.canvas, 0, 0, 1568, 784);
  });

  it('uses the height as the long edge for portrait canvases', () => {
    const target = fakeCanvas(0, 0);
    const result = downscaleCanvas(fakeCanvas(1000, 2000).canvas, 1000, () => target.canvas);
    expect([result.width, result.height]).toEqual([500, 1000]);
  });

  it('rounds to integer dimensions for non-exact ratios', () => {
    const target = fakeCanvas(0, 0);
    const result = downscaleCanvas(fakeCanvas(2000, 1333).canvas, 1568, () => target.canvas);
    expect([result.width, result.height]).toEqual([1568, 1045]);
  });

  it('throws when no 2d context is available', () => {
    const target = { width: 0, height: 0, getContext: () => null } as unknown as HTMLCanvasElement;
    expect(() => downscaleCanvas(fakeCanvas(2000, 1000).canvas, 1000, () => target)).toThrow(
      'Canvas 2D context unavailable'
    );
  });
});
