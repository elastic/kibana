/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCanvas } from '@napi-rs/canvas';
import type { ShimUsageLog } from '../worker/shim_usage_log';
import { getTakumiBackend } from './rasterize_page';

export interface PanelRasterInput {
  /** Markup with a single root, already sized to `width` x `height`. */
  html: string;
  css: string;
  width: number;
  height: number;
}

/** Raster pixels per CSS pixel for a panel image; the composer scales it back down, which keeps text crisp. */
const PANEL_RASTER_SCALE = 2;

const placeholderPng = (width: number, height: number, message: string): Buffer => {
  const canvas = createCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f7f8fc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#d3dae6';
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  ctx.fillStyle = '#69707d';
  ctx.font = '13px Inter, sans-serif';
  ctx.fillText(message, 12, 24);
  return canvas.toBuffer('image/png');
};

export interface RasterizedPanel {
  png: Buffer;
  /** Set when the panel could not be rendered faithfully; becomes a report warning. */
  warning?: string;
}

/**
 * Renders one panel to its own PNG. Per panel, not per page, so a panel Takumi can't render
 * degrades to a placeholder (and a warning) instead of failing the whole report -- Takumi
 * fails a render outright on a value it can't parse in an inline style or a glyph no
 * registered font covers. Tries the full stylesheet first, then inline styles only (which
 * rules out a bad stylesheet rule), then a placeholder.
 */
export const rasterizePanelToPng = async (
  input: PanelRasterInput,
  { usageLog, label }: { usageLog?: ShimUsageLog; label: string }
): Promise<RasterizedPanel> => {
  const backend = getTakumiBackend();
  const render = (css: string) =>
    backend.png(
      { html: input.html, css, width: input.width, height: input.height },
      { scale: PANEL_RASTER_SCALE }
    );

  try {
    return { png: await render(input.css) };
  } catch (error) {
    usageLog?.record('takumi.panelRenderFailed', `${label}: ${String(error).slice(0, 300)}`);
  }
  try {
    const png = await render('');
    return { png, warning: `Panel "${label}" rendered without its stylesheet` };
  } catch (error) {
    usageLog?.record('takumi.panelRenderFailedNoCss', `${label}: ${String(error).slice(0, 300)}`);
  }
  return {
    png: placeholderPng(input.width * PANEL_RASTER_SCALE, input.height * PANEL_RASTER_SCALE, label),
    warning: `Panel "${label}" could not be rendered`,
  };
};
