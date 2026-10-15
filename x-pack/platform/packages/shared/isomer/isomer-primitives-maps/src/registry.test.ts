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
});
