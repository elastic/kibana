/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiGraph, KiGraphNode } from '../../../utils/ki_graph';
import { createLayout, project, stepLayout } from './ki_graph_scene';

const node = (id: string, degree = 1): KiGraphNode => ({
  id,
  kind: 'ki',
  group: 'constraint',
  label: id,
  degree,
});

const graph = (): KiGraph => ({
  nodes: [node('a', 2), node('b'), node('c'), node('lonely', 0)],
  links: [
    { source: 'a', target: 'b' },
    { source: 'a', target: 'c' },
  ],
  layers: [],
  neighbors: new Map(),
  truncated: false,
});

const distance = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) =>
  Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);

describe('KI graph layout', () => {
  it('starts in the same place for the same graph', () => {
    const first = createLayout(graph()).nodes.map(({ x, y, z }) => [x, y, z]);
    const second = createLayout(graph()).nodes.map(({ x, y, z }) => [x, y, z]);
    expect(first).toEqual(second);
  });

  it('settles: linked nodes end up closer than an unlinked one, and the simulation stops', () => {
    const layout = createLayout(graph());
    let steps = 0;
    while (stepLayout(layout)) {
      steps++;
    }
    const { a, b, c, lonely } = Object.fromEntries(
      layout.nodes.map((entry) => [entry.node.id, entry])
    );

    expect(steps).toBeGreaterThan(100);
    expect(steps).toBeLessThan(1000);
    expect(distance(a, b)).toBeLessThan(distance(a, lonely));
    expect(distance(a, c)).toBeLessThan(distance(a, lonely));
    expect(layout.nodes.every(({ x, y, z }) => [x, y, z].every(Number.isFinite))).toBe(true);
  });

  it('bigger bubbles for better-connected nodes', () => {
    const { byId } = createLayout(graph());
    expect(byId.get('a')?.radius).toBeGreaterThan(byId.get('b')?.radius ?? Infinity);
  });
});

describe('project', () => {
  const viewport = { width: 800, height: 600, focal: 540 };
  const camera = { tx: 0, ty: 0, tz: 0, theta: 0, phi: 0, distance: 100 };

  it('puts the orbit target in the middle of the screen', () => {
    expect(project(camera, { x: 0, y: 0, z: 0 }, viewport)).toEqual({
      x: 400,
      y: 300,
      depth: 100,
      scale: 5.4,
    });
  });

  it('draws nearer points bigger and hides points behind the camera', () => {
    const near = project(camera, { x: 0, y: 0, z: -50 }, viewport);
    const far = project(camera, { x: 0, y: 0, z: 50 }, viewport);
    expect(near?.scale).toBeGreaterThan(far?.scale ?? Infinity);
    expect(project(camera, { x: 0, y: 0, z: -150 }, viewport)).toBeUndefined();
  });

  it('orbits: a half turn mirrors a point across the target', () => {
    const point = { x: 10, y: 0, z: 0 };
    const front = project(camera, point, viewport);
    const back = project({ ...camera, theta: Math.PI }, point, viewport);
    expect(front?.x).toBeCloseTo(454);
    expect(back?.x).toBeCloseTo(346);
  });
});
