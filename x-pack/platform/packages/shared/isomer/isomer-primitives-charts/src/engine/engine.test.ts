/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ChildNodeWalker, type Composition, createChildNodeWalker } from '@elastic/isomer-sdk';

import { examples } from '../charts/xy_chart/examples';

import { prepareCharts, readArtifact } from './artifacts';
import { composeEngines } from './compose';
import type { ChartArtifact, ChartEngine, ChartNode, DrawRequest } from './types';

const chart = examples[0] as unknown as ChartNode;

/** A walker that knows one container, `group`, holding `items`. */
const walk: ChildNodeWalker = createChildNodeWalker([
  {
    type: 'group',
    children: (node: { items: unknown[] }) =>
      node.items.map((item, index) => ({
        node: item,
        path: `items[${index}]`,
      })),
  },
]);

const artifact = (label: string): ChartArtifact => ({
  plot: { kind: 'svg', markup: `<svg>${label}</svg>` },
  width: 100,
  height: 50,
  legend: [],
});

const stubEngine = (
  draw: (node: ChartNode, request: DrawRequest) => ChartArtifact | Promise<ChartArtifact>
): ChartEngine & { calls: DrawRequest[] } => {
  const calls: DrawRequest[] = [];
  return {
    id: 'stub',
    version: '1',
    supports: {
      xyChart: { fidelity: 'native', selection: { live: true, static: false } },
    },
    calls,
    draw: (node, request) => {
      calls.push(request);
      return draw(node, request);
    },
  };
};

const view = (...body: unknown[]): Composition =>
  ({ type: 'view', body } as unknown as Composition);

describe('prepareCharts', () => {
  it('draws each chart once, holds it until release, and reads it back by content', async () => {
    const engine = stubEngine(() => artifact('a'));
    const { release } = await prepareCharts(engine, view(chart, chart), {
      walk,
      mode: 'light',
      width: 600,
    });
    expect(engine.calls).toHaveLength(1);
    expect(engine.calls[0]).toMatchObject({
      mode: 'light',
      width: 600,
      height: 320,
    });
    // A validated copy with its keys in another order is the same chart.
    const reordered = Object.fromEntries(
      Object.entries(chart as object).reverse()
    ) as unknown as ChartNode;
    expect(readArtifact(engine, reordered, 'light')).toEqual(artifact('a'));
    expect(readArtifact(engine, chart, 'dark')).toBeUndefined();
    release();
    expect(readArtifact(engine, chart, 'light')).toBeUndefined();
  });

  it('finds charts inside another pack’s containers', async () => {
    const engine = stubEngine(() => artifact('nested'));
    await prepareCharts(engine, view({ type: 'group', items: [chart] }), {
      walk,
      mode: 'dark',
      width: 300,
    });
    expect(readArtifact(engine, chart, 'dark')).toEqual(artifact('nested'));
  });

  it('keeps a drawing two overlapping calls share until both release', async () => {
    let finish: (value: ChartArtifact) => void = () => undefined;
    const engine = stubEngine(() => new Promise<ChartArtifact>((resolve) => (finish = resolve)));
    const options = { walk, mode: 'light', width: 600 } as const;
    const first = prepareCharts(engine, view(chart), options);
    const second = prepareCharts(engine, view(chart), options);
    while (engine.calls.length === 0) {
      await Promise.resolve();
    }
    finish(artifact('shared'));
    const [a, b] = await Promise.all([first, second]);
    expect(engine.calls).toHaveLength(1);
    a.release();
    expect(readArtifact(engine, chart, 'light')).toEqual(artifact('shared'));
    b.release();
    expect(readArtifact(engine, chart, 'light')).toBeUndefined();
  });

  it('leaves a chart whose drawing fails to its fallback, without failing the call', async () => {
    const engine = stubEngine(() => {
      throw new Error('no canvas');
    });
    await expect(
      prepareCharts(engine, view(chart), { walk, mode: 'light', width: 600 })
    ).resolves.toBeDefined();
    expect(readArtifact(engine, chart, 'light')).toBeUndefined();
  });

  it('separates engines and versions', async () => {
    const one = stubEngine(() => artifact('one'));
    const other = { ...stubEngine(() => artifact('other')), version: '2' };
    await prepareCharts(one, view(chart), { walk, mode: 'light', width: 600 });
    expect(readArtifact(other, chart, 'light')).toBeUndefined();
  });

  it('draws nothing for an engine without `draw` or a type it does not support', async () => {
    const live: ChartEngine = { id: 'live', version: '1', supports: {} };
    await prepareCharts(live, view(chart), { walk, mode: 'light', width: 600 });
    expect(readArtifact(live, chart, 'light')).toBeUndefined();
    const narrow = { ...stubEngine(() => artifact('x')), supports: {} };
    await prepareCharts(narrow, view(chart), {
      walk,
      mode: 'light',
      width: 600,
    });
    expect(narrow.calls).toHaveLength(0);
  });
});

describe('composeEngines', () => {
  const engine = (id: string, supports: ChartEngine['supports']): ChartEngine => ({
    id,
    version: '1',
    supports,
    draw: () => artifact(id),
  });
  const native = {
    fidelity: 'native',
    selection: { live: true, static: true },
  } as const;
  const approximate = { ...native, fidelity: 'approximate' } as const;

  it('takes each type from the first native engine, else the first approximate one', async () => {
    const composed = composeEngines(
      engine('ec', { donut: approximate, xyChart: native }),
      engine('echarts', {
        donut: native,
        xyChart: native,
        heatmap: approximate,
      })
    );
    expect(composed.supports).toEqual({
      donut: native,
      xyChart: native,
      heatmap: approximate,
    });
    const drawn = await composed.draw!(chart, {
      mode: 'light',
      width: 1,
      height: 1,
      theme: undefined as never,
    });
    expect(drawn).toEqual(artifact('ec'));
    expect(composed.version).toBe('ec@1+echarts@1');
  });
});
