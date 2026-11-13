/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';

import { examples } from './charts/xy_chart/examples';
import { chartsPack } from './pack';
import { registryTypes } from './registry.fixtures';

const [chart] = examples;
const view = (node: unknown = chart): Composition =>
  ({ type: 'view', body: [node] } as Composition);

const runtimeFor = () => createIsomerRuntime({ packs: [chartsPack] });

describe('chartsPack', () => {
  it('registers every chart type the registry lists', () => {
    expect([...chartsPack.types]).toEqual(registryTypes);
  });

  it('scopes every figure to the chart theme', () => {
    const html = runtimeFor().surfaces.html.render(view()).html;
    expect(html).toMatch(/<figure class="isomerChart /);
  });

  it('renders the summary and data table', () => {
    const html = runtimeFor().surfaces.html.render(view()).html;
    expect(html).toContain('<th scope="col"');
    expect(html).toContain('Across 3 stacked series');
  });

  it('gives Slack the words and table, even when the host collects assets', () => {
    const runtime = runtimeFor();
    const plain = runtime.surfaces.slack.render(view());
    expect(plain.assets).toEqual([]);
    expect(plain.blocks.map(({ type }) => type)).toContain('table');
    expect(runtime.surfaces.slack.render(view(), { collectAssets: true }).assets).toEqual([]);
  });

  it('keeps a table within Slack’s 100 rows, and every value past it', () => {
    const minutes = (count: number) => ({
      type: 'xyChart',
      x: { type: 'number' },
      series: [
        {
          label: 'a',
          points: Array.from({ length: count }, (_, at) => ({
            x: at,
            y: at + 0.5,
          })),
        },
      ],
    });
    const slack = (count: number) =>
      runtimeFor().surfaces.slack.render(view(minutes(count))).blocks;
    const atLimit = slack(99);
    expect(atLimit.find(({ type }) => type === 'table')).toMatchObject({
      rows: { length: 100 },
    });
    const past = slack(100);
    expect(past.some(({ type }) => type === 'table')).toBe(false);
    expect(JSON.stringify(past)).toContain('99.5');
  });
});
