/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLazyHeadlessRenderer } from './headless_renderer';

describe('createLazyHeadlessRenderer', () => {
  it('loads the engine on the first draw, once', () => {
    const render = jest.fn(() => 'svg');
    const load = jest.fn(() => ({
      createElasticChartsHeadlessRenderer: () => ({ render }),
    })) as unknown as () => typeof import('@elastic/isomer-charts-elastic/headless');
    const renderer = createLazyHeadlessRenderer({ load });
    expect(renderer.supports('xy')).toBe(true);
    expect(renderer.supports('table')).toBe(false);
    expect(renderer.environments).toEqual(['node']);
    expect(renderer.loaded).toBe(false);
    expect(load).not.toHaveBeenCalled();
    const scene = { kind: 'xy' } as never;
    const env = { environment: 'node' } as never;
    expect(renderer.render(scene, env)).toBe('svg');
    renderer.render(scene, env);
    expect(load).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(2);
    expect(renderer.loaded).toBe(true);
  });
});
