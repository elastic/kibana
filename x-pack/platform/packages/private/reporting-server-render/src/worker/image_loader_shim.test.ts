/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCanvas } from '@napi-rs/canvas';
import { LoopbackHttpClient } from '../services/loopback_http_client';
import { createHeadlessDomEnvironment } from './headless_dom_environment';

const redPngDataUrl = () => {
  const canvas = createCanvas(4, 3);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 4, 3);
  return `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`;
};

describe('image loader shim', () => {
  it('fires load for an <img>, reports its size, and lets drawImage + getImageData read it back', async () => {
    const env = createHeadlessDomEnvironment({
      loopbackHttpClient: new LoopbackHttpClient({
        baseUrl: 'http://127.0.0.1:9',
        forwardedHeaders: {},
      }),
    });
    try {
      const image = new (env.window as unknown as { Image: new () => HTMLImageElement }).Image();
      const loaded = new Promise<void>((resolve) =>
        image.addEventListener('load', () => resolve())
      );
      image.src = redPngDataUrl();
      await loaded;

      expect([image.naturalWidth, image.naturalHeight]).toEqual([4, 3]);
      expect(image.complete).toBe(true);

      const canvas = env.document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 3;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      expect(Array.from(ctx.getImageData(1, 1, 1, 1).data)).toEqual([255, 0, 0, 255]);

      // A canvas element can be drawn onto another.
      const second = env.document.createElement('canvas');
      second.width = 4;
      second.height = 3;
      const ctx2 = second.getContext('2d')!;
      ctx2.drawImage(canvas, 0, 0);
      expect(Array.from(ctx2.getImageData(2, 2, 1, 1).data)).toEqual([255, 0, 0, 255]);
    } finally {
      env.dispose();
    }
  });

  it('fires error for bytes that are not an image', async () => {
    const env = createHeadlessDomEnvironment({
      loopbackHttpClient: new LoopbackHttpClient({
        baseUrl: 'http://127.0.0.1:9',
        forwardedHeaders: {},
      }),
    });
    try {
      const image = new (env.window as unknown as { Image: new () => HTMLImageElement }).Image();
      const failed = new Promise<void>((resolve) =>
        image.addEventListener('error', () => resolve())
      );
      image.src = 'data:image/png;base64,AAAA';
      await failed;
      expect(env.usageLog.getEntries().map((e) => e.name)).toContain('image.failed');
    } finally {
      env.dispose();
    }
  });
});
