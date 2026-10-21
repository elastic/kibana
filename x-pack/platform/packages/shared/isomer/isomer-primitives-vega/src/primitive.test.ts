/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Frame, PrimitiveNode } from '@elastic/isomer-sdk';
import { runPrimitiveInventoryConformance } from '@elastic/isomer-sdk/testing';
import { stubGlobal, unstubAllGlobals } from './test_helpers/stub_global';

import { vegaExample, vegaExamples, vegaGrammarExample } from './examples';
import { createVegaPack } from './pack';
import { createVegaPrimitive, MAX_CHART_SIDE, VEGA_INTERACTIVE, type VegaNode } from './primitive';
import { vegaDarkTheme, vegaLightTheme } from './theme';

interface Mode {
  mode: 'light' | 'dark';
}

/** A frame that draws no surround and sizes to its body. */
const chartFrame: Frame<Mode> = {
  defaultWidth: 520,
  theme: { light: { mode: 'light' }, dark: { mode: 'dark' } },
  estimateHeight: ({ body }, dispatcher) =>
    (body ?? []).reduce((sum, node) => sum + dispatcher.estimateSnapshotHeight(node), 0),
  wrap: (_header, body) => createElement('div', null, ...body),
};

const runtime = createIsomerRuntime({
  packs: [
    createVegaPack({
      snapshotTheme: (theme) => ((theme as Mode).mode === 'dark' ? vegaDarkTheme : vegaLightTheme),
    }),
  ],
  frames: { chart: chartFrame },
});

const markupOf = (node: ReactNode) => renderToStaticMarkup(createElement(Fragment, null, node));

const view = (...body: object[]) => ({
  type: 'view' as const,
  body: body as PrimitiveNode[],
});

const errors = (node: object) =>
  runtime.validate(view(node)).errors.map(({ path, message }) => `${path}: ${message}`);

const withSpec = (spec: object): VegaNode => ({ ...vegaExample, spec } as VegaNode);

runPrimitiveInventoryConformance([createVegaPrimitive()]);

describe('vega schema', () => {
  it('leaves the caller’s rows and the checked copy untouched', () => {
    const rows = [{ day: 'Mon', errors: 1 }];
    const node = withSpec({ ...vegaExample.spec, data: { values: rows } });
    const { composition } = runtime.validate(view(node));
    runtime.surfaces.html.render(view(node));
    const [checked] = (composition?.body ?? []) as VegaNode[];
    const checkedRows = (checked?.spec.data as { values: object[] }).values;
    for (const row of [...rows, ...checkedRows]) {
      expect(Object.getOwnPropertySymbols(row)).toEqual([]);
    }
  });

  it('accepts both grammars', () => {
    expect(errors(vegaExample)).toEqual([]);
    expect(errors(vegaGrammarExample)).toEqual([]);
  });

  it('names every place a spec reaches out, under the node', () => {
    expect(
      errors(
        withSpec({
          ...vegaExample.spec,
          data: { url: 'https://example.com/cars.json' },
          encoding: {
            ...(vegaExample.spec.encoding as object),
            href: { field: 'link' },
          },
        })
      )
    ).toEqual([
      'body[0].spec.data.url: a chart cannot load anything by URL; inline its data under `values`',
      'body[0].spec.encoding.href: a chart cannot link out; remove `href`',
    ]);
  });

  it('reports a spec Vega cannot parse', () => {
    expect(
      errors({
        ...vegaGrammarExample,
        spec: {
          ...vegaGrammarExample.spec,
          signals: [{ name: 'x', update: 'kibanaSetTimeFilter(1, 2)' }],
        },
      })
    ).toEqual([expect.stringMatching(/^body\[0\]\.spec: .*kibanaSetTimeFilter/)]);
  });

  it.each([
    ['a missing mode', { mode: undefined }],
    ['an unknown mode', { mode: 'vega-lite-5' }],
    ['an empty caption', { caption: '' }],
    ['a fractional width', { width: 10.5 }],
    ['an oversized height', { height: MAX_CHART_SIDE + 1 }],
    ['a spec that is not an object', { spec: [] }],
  ])('rejects %s', (_name, change) => {
    expect(errors({ ...vegaExample, ...change })).toHaveLength(1);
  });
});

describe('every example', () => {
  it.each(vegaExamples.map(({ name, node }) => [name, node] as const))(
    '%s validates and draws on every surface',
    (_name, node) => {
      const composition = view(node);
      expect(runtime.validate(composition).errors).toEqual([]);
      const { html } = runtime.surfaces.html.render(composition);
      expect(html).toContain('<svg');
      expect(html).not.toContain('data-isomer-vega-error');
      expect(runtime.surfaces.snapshot.render(composition).html).toContain('<svg');
      expect(runtime.surfaces.text.render(composition)).toContain(node.caption);
      expect(runtime.surfaces.markdown.render(composition)).toContain(node.caption);
    }
  );
});

describe('vega rendering', () => {
  const html = (node: object, enhancements: string[] = []) =>
    runtime.surfaces.html.render(view(node), {
      enhancements,
      onValidationError: 'collect',
    }).html;

  it('draws inline SVG at the node size, labelled by its caption', () => {
    const markup = html(vegaExample);
    expect(markup).toContain(`role="img" aria-label="${vegaExample.caption}"><svg`);
    expect(markup).toMatch(/<svg[^>]* width="480" height="240"/);
    expect(markup).not.toContain('data-isomer-vega-spec');
  });

  it('embeds the compiled spec, safe inside a script, only for the enhancement', () => {
    const node = withSpec({
      ...vegaExample.spec,
      title: '</script><script>alert(1)</script>',
    });
    const markup = html(node, [VEGA_INTERACTIVE]);
    const [, json] =
      /<script type="application\/json" data-isomer-vega-spec="">(.*?)<\/script>/.exec(markup) ??
      [];
    expect(json).toContain('\\u003c/script\\u003e');
    const spec = JSON.parse(json ?? 'null') as {
      $schema: string;
      config: { events: { selector: boolean } };
    };
    expect(spec.$schema).toContain('vega/v6');
    expect(spec.config.events.selector).toBe(false);
  });

  it('renders an unvalidated node without fetching or linking', () => {
    const fetch = jest.fn();
    stubGlobal('fetch', fetch);
    try {
      const node = withSpec({
        ...vegaExample.spec,
        data: {
          url: 'https://example.com/a.json',
          values: [{ day: 'x', errors: 1 }],
        },
        encoding: {
          ...(vegaExample.spec.encoding as object),
          href: { value: 'https://example.com/link' },
        },
      });
      const markup = markupOf(runtime.surfaces.react.renderNode(node));
      expect(markup).toContain('<svg');
      expect(markup).not.toMatch(/example\.com|javascript:|<a[\s>]/);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      unstubAllGlobals();
    }
  });

  it('falls back to its caption when Vega cannot draw the spec', () => {
    const markup = markupOf(
      runtime.surfaces.react.renderNode({
        ...vegaGrammarExample,
        spec: { marks: [{ type: 'rect', from: { data: 'missing' } }] },
      } as PrimitiveNode)
    );
    expect(markup).toContain('data-isomer-vega-error=');
    expect(markup).toContain(vegaGrammarExample.caption);
  });

  it('prints the caption and a data summary as text and markdown', () => {
    expect(runtime.surfaces.text.renderNode(vegaExample)).toBe(
      'Checkout errors peaked on Wednesday and fell back by Friday. (Chart of 5 rows of day, errors.)'
    );
    expect(runtime.surfaces.markdown.renderNode(vegaGrammarExample)).toMatchInlineSnapshot(`
      "**Three regions by share of revenue.**

      _Chart of 3 rows of region, share._

      | region | share |
      | - | - |
      | EMEA | 0.42 |
      | AMER | 0.38 |
      | APAC | 0.2 |"
    `);
  });

  it('reads rows where `format.property` points, as Kibana inlines a search response', () => {
    const node = {
      ...vegaGrammarExample,
      spec: {
        ...vegaGrammarExample.spec,
        data: [
          {
            name: 'table',
            values: {
              aggregations: { b: { buckets: [{ key: 'a', doc_count: 3 }] } },
            },
            format: { property: 'aggregations.b.buckets' },
          },
        ],
      },
    };
    expect(runtime.surfaces.text.renderNode(node as PrimitiveNode)).toContain(
      '1 row of key, doc_count'
    );
  });

  it('sends Slack a picture to upload, with the text form as alt text', () => {
    const { blocks, assets } = runtime.surfaces.slack.render(view(vegaExample), {
      collectAssets: true,
    });
    expect(blocks).toEqual([
      expect.objectContaining({
        type: 'image',
        alt_text: expect.stringContaining('Checkout errors') as unknown,
      }),
    ]);
    expect(assets).toHaveLength(1);
  });

  it('draws the snapshot in the frame’s mode', () => {
    for (const [mode, theme] of [
      ['light', vegaLightTheme],
      ['dark', vegaDarkTheme],
    ] as const) {
      const snapshot = runtime.surfaces.snapshot.render(view(vegaExample), {
        theme: mode,
      });
      expect(snapshot.height).toBe(vegaExample.height);
      expect(snapshot.html).toContain(`fill="${theme.text}"`);
      expect(snapshot.html).not.toContain('data-isomer-vega-spec');
    }
  });

  it('uses the pack theme on react and html', () => {
    expect(markupOf(runtime.surfaces.react.renderNode(vegaExample))).toContain(
      'fill="currentColor"'
    );
  });
});

describe('vega basemap', () => {
  const tile = 'data:image/png;base64,iVBORw0KGgo=';
  const mapNode = (src: string) =>
    ({
      ...withSpec({ ...vegaExample.spec, background: 'transparent' }),
      basemap: { tiles: [{ src, x: -10, y: 0, width: 256, height: 256 }] },
    } as VegaNode);

  it('draws host tiles under the chart, in its pixel frame', () => {
    expect(errors(mapNode(tile))).toEqual([]);
    const { html } = runtime.surfaces.html.render(view(mapNode(tile)));
    const svg = html.slice(html.indexOf('<svg'));
    expect(svg.indexOf(`<image href="${tile}" x="-10"`)).toBeGreaterThan(0);
    expect(svg.indexOf('<image')).toBeLessThan(svg.indexOf('<path'));
  });

  it('accepts only an inline raster, so a tile cannot fetch', () => {
    expect(errors(mapNode('https://tiles.example/0/0/0.png'))).not.toEqual([]);
    expect(errors(mapNode('data:image/svg+xml;base64,PHN2Zz4='))).not.toEqual([]);
  });
});
