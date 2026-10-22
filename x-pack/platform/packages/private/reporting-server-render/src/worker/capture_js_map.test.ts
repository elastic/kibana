/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHeadlessDomEnvironment } from './headless_dom_environment';
import type { JsMapLike } from './capture_js_map';
import {
  captureMap,
  findMapInstance,
  mapFingerprint,
  waitForMapPanelsSettled,
} from './capture_js_map';

const fakeMap = (overrides: Partial<JsMapLike> = {}): JsMapLike =>
  ({
    loaded: () => true,
    getStyle: () => ({ sources: { a: { type: 'geojson' } }, layers: [{ id: 'l' }] }),
    getCenter: () => ({ lng: 1, lat: 2 }),
    getZoom: () => 4,
    getBearing: () => 0,
    getPitch: () => 0,
    getCanvas: () => ({ style: { width: '300px', height: '150px' } }),
    style: {
      imageManager: {
        images: {
          icon: {
            data: { width: 1, height: 1, data: new Uint8Array([1, 2, 3, 4]) },
            pixelRatio: 2,
            sdf: true,
          },
        },
      },
      sourceCaches: {
        a: {
          _state: {
            state: { _geojsonTileLayer: { '5': { color: 'red' } } },
            stateChanges: { _geojsonTileLayer: { '5': { size: 3 }, '6': { color: 'blue' } } },
          },
        },
        tiles: { _state: { state: { hits: { abc: { c: 1 } } }, stateChanges: {} } },
      },
    },
    ...overrides,
  } as unknown as JsMapLike);

describe('captureMap', () => {
  it('reads style, images, merged feature state, view and canvas size', () => {
    const captured = captureMap(fakeMap());
    expect(captured.center).toEqual([1, 2]);
    expect(captured.zoom).toBe(4);
    expect([captured.cssWidth, captured.cssHeight]).toEqual([300, 150]);
    expect(captured.images).toEqual([
      {
        id: 'icon',
        width: 1,
        height: 1,
        pixelRatio: 2,
        sdf: true,
        data: Buffer.from([1, 2, 3, 4]),
      },
    ]);
    // state + stateChanges merged; numeric ids parsed; the GeoJSON internal layer omitted.
    expect(captured.featureStates).toEqual(
      expect.arrayContaining([
        { source: 'a', id: 5, state: { color: 'red', size: 3 } },
        { source: 'a', id: 6, state: { color: 'blue' } },
        { source: 'tiles', sourceLayer: 'hits', id: 'abc', state: { c: 1 } },
      ])
    );
  });

  it('fingerprints change when the style changes', () => {
    let layers = 1;
    const map = fakeMap({
      getStyle: () => ({ sources: {}, layers: new Array(layers).fill({ id: 'x' }) }),
    });
    const before = mapFingerprint(map);
    layers = 2;
    expect(mapFingerprint(map)).not.toBe(before);
  });
});

describe('findMapInstance / waitForMapPanelsSettled', () => {
  const mountPanel = (env: ReturnType<typeof createHeadlessDomEnvironment>, map?: JsMapLike) => {
    env.document.body.innerHTML = '<div id="panel-m"><div class="maplibregl-map"></div></div>';
    const container = env.document.getElementsByClassName('maplibregl-map')[0] as unknown as Record<
      string,
      unknown
    >;
    if (map) container.__reactFiber$test = { return: { stateNode: { _mbMap: map } } };
  };

  it('finds the map by walking the React fiber from the container', () => {
    const env = createHeadlessDomEnvironment();
    try {
      const map = fakeMap();
      mountPanel(env, map);
      expect(findMapInstance(env.document.getElementById('panel-m')!)).toBe(map);
    } finally {
      env.dispose();
    }
  });

  it('settles once the fingerprint is quiet, and reports a panel with no map container quickly', async () => {
    const env = createHeadlessDomEnvironment();
    try {
      mountPanel(env, fakeMap());
      const started = Date.now();
      const settled = await waitForMapPanelsSettled(env, ['m'], { quietMs: 150, timeoutMs: 3000 });
      expect(settled.get('m')!.map).toBeDefined();
      expect(Date.now() - started).toBeGreaterThanOrEqual(140);

      env.document.body.innerHTML = '<div id="panel-n"></div>';
      const none = await waitForMapPanelsSettled(env, ['n'], {
        mountGraceMs: 100,
        timeoutMs: 3000,
      });
      expect(none.get('n')).toEqual({ note: 'no map was created' });
    } finally {
      env.dispose();
    }
  });
});
