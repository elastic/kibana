/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CapturedMap } from './capture_js_map';
import { exportMapStyleForNative } from './export_map_style';

const capture = (overrides: Partial<CapturedMap> = {}): CapturedMap => ({
  style: {
    version: 8,
    projection: { type: 'globe' },
    sprite: 'https://tiles.example/sprite',
    glyphs: '/mje/internal/maps/fonts/{fontstack}/{range}',
    sources: {
      tiles: { type: 'vector', tiles: ['/mje/internal/maps/mvt/getTile/{z}/{x}/{y}.pbf?x=1'] },
      points: {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              id: 1,
              properties: { name: 'a' },
              geometry: { type: 'Point', coordinates: [0, 0] },
            },
            {
              type: 'Feature',
              id: 2,
              properties: {},
              geometry: { type: 'Point', coordinates: [1, 1] },
            },
          ],
        },
      },
      live: { type: 'canvas', canvas: 'x' },
    },
    layers: [
      { id: 'bg', type: 'background' },
      {
        id: 'circles',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-color': [
            'case',
            ['has', ['feature-state', 'color']],
            ['feature-state', 'color'],
            '#000',
          ],
        },
        filter: ['>', ['feature-state', 'size'], 1],
      },
      { id: 'mvt', type: 'fill', source: 'tiles', paint: { 'fill-color': ['feature-state', 'c'] } },
      { id: 'orphan', type: 'fill', source: 'live' },
      { id: 'missing', type: 'fill', source: 'gone' },
    ],
  } as unknown as CapturedMap['style'],
  images: [
    {
      id: 'icon',
      width: 1,
      height: 1,
      pixelRatio: 1,
      sdf: false,
      data: Buffer.from([0, 0, 0, 255]),
    },
  ],
  featureStates: [
    { source: 'points', id: 1, state: { color: '#f00', size: 5 } },
    { source: 'tiles', sourceLayer: 'hits', id: 7, state: { c: '#0f0' } },
  ],
  center: [10, 20],
  zoom: 3,
  bearing: 0,
  pitch: 0,
  cssWidth: 100,
  cssHeight: 50,
  ...overrides,
});

describe('exportMapStyleForNative', () => {
  const resolveUrl = (path: string) => `http://kibana.test${path}`;

  it('removes what Native cannot draw and makes relative URLs absolute', () => {
    const { style } = exportMapStyleForNative(capture(), { resolveUrl });
    expect(style.projection).toBeUndefined();
    expect(style.sprite).toBeUndefined();
    expect(style.glyphs).toBe('http://kibana.test/mje/internal/maps/fonts/{fontstack}/{range}');
    const sources = style.sources as Record<string, { tiles?: string[] }>;
    expect(sources.tiles.tiles![0]).toBe(
      'http://kibana.test/mje/internal/maps/mvt/getTile/{z}/{x}/{y}.pbf?x=1'
    );
    expect(sources.live).toBeUndefined();
    expect((style.layers as Array<{ id: string }>).map((l) => l.id)).toEqual([
      'bg',
      'circles',
      'mvt',
    ]);
  });

  it('bakes feature-state into GeoJSON properties and rewrites its expressions to get', () => {
    const exported = exportMapStyleForNative(capture(), { resolveUrl });
    const sources = exported.style.sources as Record<
      string,
      { data: { features: Array<{ properties: object }> } }
    >;
    expect(sources.points.data.features[0].properties).toEqual({
      name: 'a',
      color: '#f00',
      size: 5,
    });
    expect(sources.points.data.features[1].properties).toEqual({});
    const circles = (exported.style.layers as Array<Record<string, unknown>>).find(
      (l) => l.id === 'circles'
    )!;
    expect(JSON.stringify(circles)).not.toContain('feature-state');
    expect(circles.filter).toEqual(['>', ['get', 'size'], 1]);
    expect((circles.paint as Record<string, unknown>)['circle-color']).toEqual([
      'case',
      ['has', ['get', 'color']],
      ['get', 'color'],
      '#000',
    ]);
  });

  it('keeps vector-tile feature state for setFeatureState replay, and carries the view and images', () => {
    const exported = exportMapStyleForNative(capture(), { resolveUrl });
    expect(exported.featureStates).toEqual([
      { source: 'tiles', sourceLayer: 'hits', id: 7, state: { c: '#0f0' } },
    ]);
    const mvt = (exported.style.layers as Array<Record<string, unknown>>).find(
      (l) => l.id === 'mvt'
    )!;
    expect(JSON.stringify(mvt)).toContain('feature-state');
    expect(exported.view).toEqual({ center: [10, 20], zoom: 3, bearing: 0, pitch: 0 });
    expect(exported.images).toHaveLength(1);
  });
});
