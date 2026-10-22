/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { ShimUsageLog } from '../worker/shim_usage_log';
import { rasterizePanelToPng } from './rasterize_panel';

const inkPixels = async (png: Buffer) => {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] < 140) ink++;
  return ink;
};

const panel = (text: string) => ({
  html: `<div style="width:200px;height:40px;background:#fff;color:#000;font:20px Inter, sans-serif">${text}</div>`,
  css: '',
  width: 200,
  height: 40,
});

describe('rasterizePanelToPng', () => {
  // Takumi's WASM/native pieces can fail to initialise under Jest; the probe script covers that.
  it('renders CJK text through the registered fallback font instead of failing or going blank', async () => {
    const usageLog = new ShimUsageLog();
    const { png, warning } = await rasterizePanelToPng(panel('漢字測試'), {
      usageLog,
      label: 'cjk',
    });
    expect(warning).toBeUndefined();
    expect(await inkPixels(png)).toBeGreaterThan(100);
  });

  it('falls back to a placeholder, with a warning, when the markup cannot be rendered', async () => {
    const usageLog = new ShimUsageLog();
    const { png, warning } = await rasterizePanelToPng(
      { ...panel('x'), html: '<div style="width:10px;height:10px;overflow:auto">x</div>' },
      { usageLog, label: 'bad inline style' }
    );
    expect(warning).toMatch(/bad inline style/);
    expect(png.length).toBeGreaterThan(0);
  });
});
