/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LoopbackHttpClient } from '../services/loopback_http_client';
import type { CapturedMap } from './capture_js_map';
import { exportMapStyleForNative } from './export_map_style';
import { createNativeRequestHandler, renderNativeMap } from './render_map_panel';

const client = new LoopbackHttpClient({ baseUrl: 'http://127.0.0.1:9', forwardedHeaders: {} });

const pixelAt = (rgba: Uint8Array, width: number, x: number, y: number) => {
  const i = (y * width + x) * 4;
  return [rgba[i], rgba[i + 1], rgba[i + 2]];
};

describe('renderNativeMap (MapLibre Native)', () => {
  // No network: inline GeoJSON and a background. Feature-state is baked into properties by the
  // export, so the two circles differ in colour only if that whole path works.
  const capture: CapturedMap = {
    style: {
      version: 8,
      sources: {
        pts: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                id: 1,
                properties: {},
                geometry: { type: 'Point', coordinates: [-2, 0] },
              },
              {
                type: 'Feature',
                id: 2,
                properties: {},
                geometry: { type: 'Point', coordinates: [2, 0] },
              },
            ],
          },
        },
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#ffffff' } },
        {
          id: 'c',
          type: 'circle',
          source: 'pts',
          paint: { 'circle-radius': 20, 'circle-color': ['feature-state', 'color'] },
        },
      ],
    } as unknown as CapturedMap['style'],
    images: [],
    featureStates: [
      { source: 'pts', id: 1, state: { color: '#ff0000' } },
      { source: 'pts', id: 2, state: { color: '#0000ff' } },
    ],
    center: [0, 0],
    zoom: 3,
    bearing: 0,
    pitch: 0,
    cssWidth: 200,
    cssHeight: 100,
  };

  it('draws data-driven GeoJSON layers from baked feature state, at the requested ratio', async () => {
    const exported = exportMapStyleForNative(capture, { resolveUrl: (p) => client.resolveUrl(p) });
    const image = await renderNativeMap({ exported, client, ratio: 1 });
    expect([image.width, image.height]).toEqual([200, 100]);
    // Zoom 3 is 4096px for 360 degrees (~11.4px per degree), so 2 degrees is ~23px either side of the centre.
    const left = pixelAt(image.rgba, image.width, 100 - 23, 50);
    const right = pixelAt(image.rgba, image.width, 100 + 23, 50);
    expect(left[0]).toBeGreaterThan(200);
    expect(left[2]).toBeLessThan(80);
    expect(right[2]).toBeGreaterThan(200);
    expect(right[0]).toBeLessThan(80);
    const corner = pixelAt(image.rgba, image.width, 2, 2);
    expect(corner).toEqual([255, 255, 255]);
  });

  it('renders at ratio 2 with twice the pixels', async () => {
    const exported = exportMapStyleForNative(capture, { resolveUrl: (p) => client.resolveUrl(p) });
    const image = await renderNativeMap({ exported, client, ratio: 2 });
    expect([image.width, image.height]).toEqual([400, 200]);
  });
});

describe('createNativeRequestHandler', () => {
  it('refuses origins that are not Kibana or allow-listed', async () => {
    const handler = createNativeRequestHandler(client, ['https://tiles.maps.elastic.co']);
    const error = await new Promise<Error | undefined>((resolve) =>
      handler({ url: 'https://evil.example/x.pbf', kind: 3 }, (e) => resolve(e))
    );
    expect(error?.message).toMatch(/non-allow-listed origin/);
  });
});
