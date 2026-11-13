/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { createKibanaIsomerRuntime } from '@kbn/isomer';
import { defineMapsPack, mapsPack } from './pack';
import { mapExamples } from './examples';

describe('@kbn/isomer-primitives-maps', () => {
  it('registers the map primitive as a Slack asset', () => {
    expect(mapsPack.id).toBe('maps');
    expect(mapsPack.primitives).toHaveLength(1);
    expect(mapsPack.slackAssetTypes.has('map')).toBe(true);
  });

  it('validates and draws its examples', () => {
    const runtime = createKibanaIsomerRuntime({ packs: [mapsPack] });
    for (const example of mapExamples) {
      const composition = { type: 'view' as const, body: [example] };
      expect(runtime.validate(composition).valid).toBe(true);
      expect(runtime.surfaces.html.render(composition).html).toContain('<svg');
    }
  });

  it('draws a fixed view where Web Mercator puts it, and fills regions from host geometry', () => {
    const square = (code: string, west: number, south: number, east: number, north: number) => ({
      properties: { iso2: code },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
    });
    const runtime = createKibanaIsomerRuntime({
      packs: [
        defineMapsPack({
          geometry: {
            world_countries: {
              type: 'FeatureCollection',
              features: [square('AA', -10, -10, 10, 10)],
            },
          },
        }),
      ],
    });
    const { html } = runtime.surfaces.html.render({
      type: 'view',
      body: [
        // A map node, which the SDK's body type does not know.
        {
          type: 'map',
          width: 512,
          height: 512,
          view: { lat: 0, lon: 0, zoom: 0 },
          regionSet: 'world_countries',
          regionRamp: 'blues',
          regions: [{ code: 'AA', value: 3 }],
          markers: [{ id: 'origin', lat: 0, lon: 0 }],
        } as PrimitiveNode,
      ],
    });
    expect(html).toMatch(/<circle[^>]*cx="256"[^>]*cy="256"/);
    expect(html).toContain('fill="#61a2ff"');
  });

  it('fills regions of any EMS file by its join key, and lets a raster basemap replace the outlines', () => {
    const polygon = (properties: Record<string, unknown>) => ({
      properties,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-10, -10],
            [10, -10],
            [10, 10],
            [-10, 10],
            [-10, -10],
          ],
        ],
      },
    });
    const geometry = {
      world_countries: { type: 'FeatureCollection' as const, features: [polygon({ iso2: 'AA' })] },
      canada_provinces: {
        type: 'FeatureCollection' as const,
        features: [polygon({ label_en: 'Yukon' })],
      },
    };
    const runtime = createKibanaIsomerRuntime({ packs: [defineMapsPack({ geometry })] });
    const map = (extra: Record<string, unknown>) =>
      runtime.surfaces.html.render({
        type: 'view',
        body: [
          {
            type: 'map',
            width: 256,
            height: 256,
            view: { lat: 0, lon: 0, zoom: 0 },
            regionSet: 'canada_provinces',
            regionKey: 'label_en',
            regions: [{ code: 'Yukon', value: 1 }],
            ...extra,
          } as PrimitiveNode,
        ],
      });
    expect(
      runtime.validate({
        type: 'view',
        body: [{ type: 'map', regionSet: 'canada_provinces', regions: [] } as PrimitiveNode],
      }).errors
    ).toEqual([]);
    const outlined = map({}).html;
    expect(outlined.match(/<path/g)?.length).toBe(2);
    const tile = 'data:image/png;base64,AAAA';
    const based = map({
      basemap: { zoom: 0, originX: 0, originY: 0, tiles: [{ col: 0, row: 0, src: tile }] },
    }).html;
    expect(based).toContain(tile);
    expect(based.match(/<path/g)?.length).toBe(1);
    // A layer stack draws every region set it names, each by its own key.
    const stacked = map({
      layers: [
        {
          kind: 'regions',
          regionSet: 'world_countries',
          regionKey: 'iso2',
          color: '#2200ff',
          opacity: 0.5,
          regions: [{ code: 'AA', value: 2 }],
        },
      ],
    }).html;
    expect(stacked.match(/<path/g)?.length).toBe(3);
    expect(stacked).toMatch(/fill="#2200ff" fill-opacity="0.5"/);
  });
});
