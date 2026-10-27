/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderVegaSvg, toVegaSpec, vegaBorealisLightTheme } from '@kbn/isomer-primitives-vega';

import { corpusObjects } from './corpus.test_helpers';
import { inlineVegaData, parseKibanaVegaSpec, vegaSources, withoutKibanaConfig } from './vega';
import {
  basemapTiles,
  KIBANA_MAP_PROJECTION,
  kibanaConfigOf,
  kibanaMapStyle,
  lowerKibanaMapSpec,
  parseKibanaMapView,
} from './vega_map';

const SIZE = { width: 600, height: 300 };

/** The SVG Vega draws for a lowered spec, through the Vega pack the node renders with. */
const draw = (spec: Record<string, unknown>) => {
  const node = { mode: 'vega' as const, spec, ...SIZE };
  return renderVegaSvg(toVegaSpec(node, vegaBorealisLightTheme), node).svg;
};

describe('parseKibanaMapView', () => {
  it('defaults as Kibana does: the origin at zoom 3, with the theme’s basemap', () => {
    expect(parseKibanaMapView({ type: 'map' })).toEqual({
      view: { latitude: 0, longitude: 0, zoom: 3, mapStyle: true },
      warnings: [],
    });
  });

  it('warns and falls back where Kibana does', () => {
    const { view, warnings } = parseKibanaMapView({
      type: 'map',
      mapStyle: 'default',
      zoom: 25,
      minZoom: 12,
      maxZoom: 4,
      latitude: 'north',
    });
    expect(view).toEqual({ latitude: 0, longitude: 0, zoom: 12, mapStyle: true });
    expect(warnings).toEqual([
      'config.kibana.latitude is not valid',
      '"minZoom" and "maxZoom" have been swapped',
      'Resetting "zoom" to 12',
      'config.kibana.mapStyle must be a boolean value',
    ]);
  });

  it('picks the basemap Kibana’s map view loads', () => {
    const { view } = parseKibanaMapView({ type: 'map' });
    expect(kibanaMapStyle(view)).toBe('road_map_desaturated_v9');
    expect(kibanaMapStyle(view, true)).toBe('dark_map_v9');
    expect(kibanaMapStyle({ ...view, emsTileServiceId: 'road_map' })).toBe('road_map');
    expect(kibanaMapStyle({ ...view, mapStyle: false })).toBeUndefined();
  });
});

describe('lowerKibanaMapSpec', () => {
  const view = { latitude: 30, longitude: -120, zoom: 3, mapStyle: true };

  it('injects the map’s signals and projection, keeping what the spec defines', () => {
    const lowered = lowerKibanaMapSpec(
      {
        mode: 'vega',
        spec: {
          signals: [
            { name: 'zoom', update: '2' },
            { name: 'other', value: 1 },
          ],
          marks: [],
        },
      },
      view,
      SIZE
    );
    expect(lowered).toMatchObject({
      autosize: 'none',
      ...SIZE,
      padding: 0,
      background: 'transparent',
      signals: [
        { name: 'zoom', value: 3 },
        { name: 'other', value: 1 },
        { name: 'latitude', value: 30 },
        { name: 'longitude', value: -120 },
      ],
      projections: [KIBANA_MAP_PROJECTION],
    });
    const own = { name: 'projection', type: 'albersUsa' };
    expect(
      lowerKibanaMapSpec({ mode: 'vega', spec: { projections: [own] } }, view, SIZE).projections
    ).toEqual([own]);
  });

  it('draws the map’s center at the panel’s center, at MapLibre’s 512-pixel scale', () => {
    const point = (lon: number, lat: number) => ({
      mode: 'vega' as const,
      spec: {
        data: [{ name: 'points', values: [{ lon, lat }] }],
        marks: [
          {
            type: 'symbol',
            from: { data: 'points' },
            encode: {
              update: {
                x: { signal: "scale('projection', [datum.lon, datum.lat])[0]" },
                y: { signal: "scale('projection', [datum.lon, datum.lat])[1]" },
              },
            },
          },
        ],
      },
    });
    expect(draw(lowerKibanaMapSpec(point(-120, 30), view, SIZE))).toContain('translate(300,150)');
    // 512 * 2^3 pixels around the world: ten degrees east is 113.78 pixels right.
    expect(draw(lowerKibanaMapSpec(point(-110, 30), view, SIZE))).toMatch(
      /translate\(413\.7\d*,150\)/
    );
  });

  it('removes the projection Vega-Lite generates, unless the spec configures one', () => {
    const vl = {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: [{ lon: -120, lat: 30 }] },
      mark: 'circle',
      encoding: {
        longitude: { field: 'lon', type: 'quantitative' },
        latitude: { field: 'lat', type: 'quantitative' },
      },
    };
    const lowered = lowerKibanaMapSpec({ mode: 'vega-lite', spec: vl }, view, SIZE);
    expect(lowered.projections).toEqual([KIBANA_MAP_PROJECTION]);
    expect(draw(lowered)).toContain('translate(300,150)');
    const configured = lowerKibanaMapSpec(
      { mode: 'vega-lite', spec: { ...vl, config: { projection: { type: 'mercator' } } } },
      view,
      SIZE
    );
    expect(configured.projections).not.toContainEqual(KIBANA_MAP_PROJECTION);
  });
});

describe('basemapTiles', () => {
  it('puts the tile under the map’s center where the projection does', () => {
    // At zoom 1 the world is 2 by 2 tiles; the center of the world is their shared corner.
    const tiles = basemapTiles(
      {
        zoom: 1,
        originX: 0,
        originY: 0,
        tiles: [
          { col: 0, row: 0, src: 'a' },
          { col: 1, row: 1, src: 'b' },
        ],
      },
      { latitude: 0, longitude: 0, zoom: 1 },
      SIZE
    );
    expect(tiles).toEqual([
      { src: 'a', x: 300 - 512, y: 150 - 512, width: 512, height: 512 },
      { src: 'b', x: 300, y: 150, width: 512, height: 512 },
    ]);
  });
});

describe('map mode over the repository’s Vega specs', () => {
  const kibanaMapTest = readFileSync(
    join(
      __dirname,
      '../../../../../../../src/platform/plugins/private/vis_types/vega/public/test_utils/vega_map_test.json'
    ),
    'utf8'
  );
  const specs = [
    { id: 'vis_types/vega vega_map_test.json', text: kibanaMapTest },
    ...corpusObjects(['visualization'], 'vega').flatMap(({ file, id, attributes }) => {
      try {
        const state = JSON.parse(String(attributes.visState));
        return state?.type === 'vega'
          ? [{ id: `${file} ${id}`, text: String(state.params.spec) }]
          : [];
      } catch {
        return [];
      }
    }),
  ].filter(({ text }) => {
    const { spec } = parseKibanaVegaSpec(text);
    return kibanaConfigOf(spec)?.type === 'map';
  });

  // Recorded 2026-10-21: Kibana's own test spec and three fixtures.
  it('finds the corpus', () => {
    expect(specs.length).toBeGreaterThanOrEqual(4);
  });

  it.each(specs.map((entry) => [entry.id, entry]))('draws %s over its map', (_id, { text }) => {
    const { mode, spec } = parseKibanaVegaSpec(text);
    const { view } = parseKibanaMapView(kibanaConfigOf(spec)!);
    // Each Elasticsearch source as an empty result at the property its data reads, as no matching documents return.
    const inlined = inlineVegaData(
      spec,
      vegaSources(spec).map(({ path }) => {
        const entry = path.reduce<unknown>(
          (cursor, key) => (cursor as Record<string | number, unknown>)[key],
          spec
        ) as { format?: { property?: string } };
        const property = entry.format?.property ?? 'hits.hits';
        const values = property
          .split('.')
          .reduceRight<unknown>((inner, key) => ({ [key]: inner }), []);
        return { path, values };
      })
    );
    const lowered = lowerKibanaMapSpec({ mode, spec: withoutKibanaConfig(inlined) }, view, SIZE);
    expect(kibanaConfigOf(lowered)).toBeUndefined();
    expect(draw(lowered)).toContain('<svg');
  });
});
