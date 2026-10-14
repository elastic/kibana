/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { stubGlobal, unstubAllGlobals } from './test_helpers/stub_global';

import { hydrateVega } from './client';
import { vegaExample } from './examples';
import { vegaPack } from './pack';
import { VEGA_INTERACTIVE, type VegaNode } from './primitive';

const runtime = createIsomerRuntime({ packs: [vegaPack] });

const mount = (node: VegaNode, enhancements: string[] = [VEGA_INTERACTIVE]) => {
  const root = document.createElement('div');
  const { html } = runtime.surfaces.html.render({ type: 'view', body: [node] }, { enhancements });
  root.append(...new DOMParser().parseFromString(html, 'text/html').body.childNodes);
  document.body.append(root);
  return root;
};

describe('hydrateVega', () => {
  afterEach(() => {
    document.body.replaceChildren();
    unstubAllGlobals();
  });

  it('replaces the server SVG with a live view', async () => {
    const root = mount(vegaExample);
    const before = root.querySelector('[data-isomer-vega-chart] svg');
    const { views, dispose } = await hydrateVega(root);
    expect(views).toHaveLength(1);
    const after = root.querySelector('[data-isomer-vega-chart] svg');
    expect(after).not.toBeNull();
    expect(after).not.toBe(before);
    expect(views[0]?.data('data_0')).toHaveLength(5);
    dispose();
  });

  it('leaves a chart rendered without the enhancement as it is', async () => {
    const root = mount(vegaExample, []);
    const before = root.querySelector('[data-isomer-vega-chart] svg');
    const { views } = await hydrateVega(root);
    expect(views).toHaveLength(0);
    expect(root.querySelector('[data-isomer-vega-chart] svg')).toBe(before);
  });

  it('re-hardens an embedded spec someone edited', async () => {
    const fetch = jest.fn();
    stubGlobal('fetch', fetch);
    const root = mount(vegaExample);
    const script = root.querySelector('script[data-isomer-vega-spec]');
    const spec = JSON.parse(script?.textContent ?? '{}') as {
      data: { name: string; url?: string }[];
      config: { events: { selector: boolean } };
    };
    spec.data[0] = {
      name: spec.data[0]?.name ?? 'x',
      url: 'https://example.com/a.json',
    };
    spec.config.events.selector = true;
    script!.textContent = JSON.stringify(spec);
    const { views, dispose } = await hydrateVega(root);
    expect(fetch).not.toHaveBeenCalled();
    expect(views).toHaveLength(1);
    expect(views[0]?.data('source_0')).toEqual([]);
    expect(root.querySelector('[data-isomer-vega-chart]')?.innerHTML).not.toContain('example.com');
    dispose();
  });

  it('scrubs what data and signals set on the client, as the server does', async () => {
    const root = mount(vegaExample);
    const script = root.querySelector('script[data-isomer-vega-spec]');
    const spec = JSON.parse(script?.textContent ?? '{}') as {
      background?: unknown;
      data: { name: string; values?: object[] }[];
      marks: { encode: { update: Record<string, unknown> } }[];
    };
    spec.background = { signal: "'url(https://evil/bg.svg#p)'" };
    const [source] = spec.data;
    if (source) {
      source.values = [{ day: 'Mon', errors: 1, paint: 'url(https://evil/p)' }];
    }
    const [bars] = spec.marks;
    if (bars) {
      bars.encode.update.fill = { field: 'paint' };
    }
    script!.textContent = JSON.stringify(spec);
    const { dispose } = await hydrateVega(root);
    const chart = root.querySelector('[data-isomer-vega-chart]');
    expect(chart?.innerHTML).toContain('<path');
    expect(chart?.innerHTML).not.toContain('evil');
    dispose();
  });
});
