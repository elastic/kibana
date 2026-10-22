/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoopbackHttpClient } from '../services/loopback_http_client';
import { captureMap, waitForMapPanelsSettled } from './capture_js_map';
import { exportMapStyleForNative } from './export_map_style';
import type { HeadlessDomEnvironment } from './headless_dom_environment';
import { renderNativeMap } from './render_map_panel';

/** Raster pixels per CSS pixel for a map image; matches `PANEL_RASTER_SCALE` in `rasterize_panel.ts`. */
const MAP_RASTER_RATIO = 2;

/**
 * Paints each map panel's real picture into the live `.maplibregl-canvas`, so the generic
 * `sinkPanelElement` then handles a map like any canvas-backed panel: it keeps the panel's
 * header, layer legend and attribution DOM, and turns the canvas into an image.
 *
 * The page's own MapLibre GL JS map cannot draw (its GL context is a stub); it only does the
 * Maps client's work. This waits for it to settle, exports what it built, renders that with
 * MapLibre Native, and writes the pixels into the canvas's backing surface. A map that can't
 * be rendered becomes a labelled placeholder plus a warning in the usage log, never a failed
 * report.
 */
export const renderMapPanels = async (
  env: HeadlessDomEnvironment,
  client: LoopbackHttpClient,
  panelIds: string[],
  allowedExternalOrigins?: readonly string[]
): Promise<void> => {
  if (panelIds.length === 0) return;
  const settled = await waitForMapPanelsSettled(env, panelIds);

  for (const id of panelIds) {
    const gridItem = env.document.getElementById(`panel-${id}`);
    const canvas = gridItem?.getElementsByClassName('maplibregl-canvas')[0] as
      | HTMLCanvasElement
      | undefined;
    const backing = canvas ? env.getBackingCanvas(canvas) : undefined;
    if (!canvas || !backing) {
      env.usageLog.record('panel.warning', `Map panel "${id}" has no map canvas`);
      continue;
    }

    const startedAt = Date.now();
    const { map, note } = settled.get(id) ?? {};
    try {
      if (!map) throw new Error(note ?? 'the map was not created');
      const exported = exportMapStyleForNative(captureMap(map), {
        resolveUrl: (path) => client.resolveUrl(path),
      });
      const image = await renderNativeMap({
        exported,
        client,
        ratio: MAP_RASTER_RATIO,
        allowedExternalOrigins,
      });
      backing.width = image.width;
      backing.height = image.height;
      const ctx = backing.getContext('2d');
      const imageData = ctx.createImageData(image.width, image.height);
      imageData.data.set(image.rgba);
      ctx.putImageData(imageData, 0, 0);
      env.usageLog.record(
        'map.rendered',
        `${id}: ${image.width}x${image.height} in ${Date.now() - startedAt}ms, ${
          exported.style.layers instanceof Array ? exported.style.layers.length : '?'
        } layers`
      );
      if (note) env.usageLog.record('panel.warning', `Map panel "${id}": ${note}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      env.usageLog.record(
        'panel.warning',
        `Map panel "${id}" rendered without its map image: ${reason}`
      );
      const width =
        Math.max(1, Math.round(parseFloat(canvas.style.width) || 300)) * MAP_RASTER_RATIO;
      const height =
        Math.max(1, Math.round(parseFloat(canvas.style.height) || 150)) * MAP_RASTER_RATIO;
      backing.width = width;
      backing.height = height;
      const ctx = backing.getContext('2d');
      ctx.fillStyle = '#f7f8fc';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#69707d';
      ctx.font = `${13 * MAP_RASTER_RATIO}px Inter, sans-serif`;
      ctx.fillText('Map could not be rendered', 12 * MAP_RASTER_RATIO, 24 * MAP_RASTER_RATIO);
    }
  }
};
