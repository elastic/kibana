/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Longest edge, in pixels, of a screenshot sent to the model. */
export const SCREENSHOT_MAX_LONG_EDGE = 1568;

/** Returns the canvas itself when it fits; never upscales. */
export const downscaleCanvas = (
  canvas: HTMLCanvasElement,
  maxLongEdge: number,
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')
): HTMLCanvasElement => {
  const longEdge = Math.max(canvas.width, canvas.height);
  if (longEdge <= maxLongEdge) {
    return canvas;
  }
  const ratio = maxLongEdge / longEdge;
  const target = createCanvas();
  target.width = Math.max(1, Math.round(canvas.width * ratio));
  target.height = Math.max(1, Math.round(canvas.height * ratio));
  target.getContext('2d')?.drawImage(canvas, 0, 0, target.width, target.height);
  return target;
};
