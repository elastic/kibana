/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expressionFunction } from 'vega';
import { stubGlobal, unstubAllGlobals } from './test_helpers/stub_global';

import {
  facetExample,
  heatmapExample,
  signalExample,
  vegaExample,
  vegaGrammarExample,
} from './examples';
import {
  createVegaView,
  renderVegaSvg,
  toVegaSpec,
  type VegaChartInput,
  VegaRenderError,
} from './render';
import type { SpecObject } from './spec';
import { vegaDarkTheme, vegaLightTheme } from './theme';

const draw = (input: VegaChartInput, theme = vegaLightTheme) =>
  renderVegaSvg(toVegaSpec(input, theme), input).svg;

const vega = (spec: SpecObject): VegaChartInput => ({
  mode: 'vega',
  width: 200,
  height: 100,
  spec,
});

/** One text mark and one rect, each encoded from `encode`. */
const marks = (encode: SpecObject, signals: SpecObject[] = []) =>
  vega({
    signals,
    data: [{ name: 't', values: [{ label: 'a', link: 'https://evil.example/link' }] }],
    marks: [
      { type: 'text', from: { data: 't' }, encode: { enter: encode } },
      { type: 'rect', from: { data: 't' }, encode: { enter: encode } },
    ],
  });

describe('renderVegaSvg', () => {
  afterEach(() => {
    unstubAllGlobals();
  });

  it.each([
    ['Vega-Lite', vegaExample],
    ['Vega', vegaGrammarExample],
  ])('draws %s at the node size, matching view.toSVG', async (_name, node) => {
    const spec = toVegaSpec(node, vegaLightTheme);
    const { svg } = renderVegaSvg(spec, node);
    expect(svg).toMatch(new RegExp(`^<svg[^>]* width="${node.width}" height="${node.height}"`));
    const view = createVegaView(spec);
    const reference = await view.toSVG();
    view.finalize();
    const body = (markup: string) => markup.replace(/^<svg[^>]*>/, '');
    expect(body(svg)).toBe(body(reference));
  });

  it('numbers def ids per chart, prefixed by its spec, so charts never share one', () => {
    const gradient = (field: string): VegaChartInput => ({
      mode: 'vega-lite',
      width: 200,
      height: 100,
      spec: {
        data: { values: [{ a: 1, b: 2 }] },
        mark: 'rect',
        encoding: { color: { field, type: 'quantitative' } },
      },
    });
    const first = draw(gradient('a'));
    expect(draw(gradient('a'))).toBe(first);
    const ids = (svg: string) => [...svg.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id);
    const refs = (svg: string) => [...svg.matchAll(/url\(#([^)]+)\)/g)].map(([, id]) => id);
    expect(ids(first).length).toBeGreaterThan(0);
    expect(refs(first).every((ref) => ids(first).includes(ref))).toBe(true);
    const other = ids(draw(gradient('b')));
    expect(ids(first).some((id) => other.includes(id))).toBe(false);
  });

  it('leaves the spec it renders untouched and serializable', () => {
    const spec = toVegaSpec(
      vega({
        data: [
          {
            name: 'nodes',
            values: [{ id: 1 }, { id: 2 }],
            transform: [
              {
                type: 'force',
                static: true,
                iterations: 10,
                forces: [{ force: 'center' }],
              },
            ],
          },
        ],
        marks: [
          {
            type: 'symbol',
            from: { data: 'nodes' },
            encode: { update: { x: { field: 'x' }, y: { field: 'y' } } },
          },
        ],
      }),
      vegaLightTheme
    );
    const before = JSON.stringify(spec);
    renderVegaSvg(spec, { width: 200, height: 100 });
    expect(JSON.stringify(spec)).toBe(before);
  });

  it('labels a temporal axis whose domain is timestamps, as the code generator does', () => {
    const svg = draw({
      mode: 'vega-lite',
      width: 400,
      height: 200,
      spec: {
        data: { values: [{ ts: 1500400000000, v: 1 }] },
        mark: 'line',
        encoding: {
          x: {
            field: 'ts',
            type: 'temporal',
            scale: { domain: [1500000000000, 1500900000000] },
          },
          y: { field: 'v', type: 'quantitative' },
        },
      },
    });
    expect(svg).toMatch(/>Jul \d+</);
  });

  it.each([
    ['facet headers', facetExample, `fill="${vegaDarkTheme.text}"`],
    // The legend gradient starts at `vegaDarkTheme.ramp[0]`, `#1F6B55`.
    ['a heatmap ramp', heatmapExample, 'stop-color="rgb(31, 107, 85)"'],
    ['a Vega rule', signalExample, `stroke="${vegaDarkTheme.text}"`],
  ])('themes %s', (_name, node, expected) => {
    expect(draw(node, vegaDarkTheme)).toContain(expected);
  });

  it('fits a Vega spec to the node, unless the spec turns autosize off as Kibana allows', () => {
    const grammar = vegaGrammarExample as VegaChartInput;
    expect(toVegaSpec(grammar, vegaLightTheme).autosize).toEqual({
      type: 'fit',
      contains: 'padding',
    });
    expect(
      toVegaSpec({ ...grammar, spec: { ...grammar.spec, autosize: 'none' } }, vegaLightTheme)
        .autosize
    ).toBe('none');
  });

  it('draws with the theme, under the spec’s own config', () => {
    const light = draw(vegaExample);
    expect(light).toContain(vegaLightTheme.palette[0]);
    expect(light).toContain(`fill="${vegaLightTheme.text}"`);
    expect(draw(vegaExample, vegaDarkTheme)).toContain(`fill="${vegaDarkTheme.text}"`);
    expect(
      draw({
        ...vegaExample,
        spec: { ...vegaExample.spec, config: { mark: { color: '#123456' } } },
      })
    ).toContain('#123456');
  });

  it('never evaluates an expression through the Function constructor', () => {
    const real = globalThis.Function;
    const refuse = () => {
      throw new Error('Function constructor called');
    };
    stubGlobal('Function', new Proxy(real, { construct: refuse, apply: refuse }));
    expect(
      draw(
        marks(
          {
            text: { signal: "upper(datum.label) + '!' + hypot(3, 4)" },
            x: { signal: 'w / 2' },
          },
          [{ name: 'w', update: 'width * 2' }]
        )
      )
    ).toContain('A!5');
  });

  it('calls a function a host registers on `vega`, as Kibana stubs register', () => {
    expressionFunction('isomerTestEcho', (value: string) => `echo:${value}`);
    expect(draw(marks({ text: { signal: 'isomerTestEcho(datum.label)' } }))).toContain('echo:a');
  });

  it('throws, rather than drawing a partial chart, when the dataflow fails', () => {
    const input = vega({
      data: [
        {
          name: 't',
          values: [{ a: 1 }],
          transform: [{ type: 'formula', expr: 'datum.missing.deeper', as: 'b' }],
        },
      ],
    });
    expect(() => draw(input)).toThrow(VegaRenderError);
  });

  it('records Vega-Lite warnings instead of printing them', () => {
    const warn = jest.spyOn(console, 'warn');
    const log = { errors: [], warnings: [] };
    toVegaSpec(
      {
        ...vegaExample,
        spec: {
          ...vegaExample.spec,
          encoding: { shape: { field: 'day', type: 'nominal' } },
        },
      },
      vegaLightTheme,
      log
    );
    expect(warn).not.toHaveBeenCalled();
    expect(log.warnings).toEqual([expect.stringContaining('shape dropped')]);
    warn.mockRestore();
  });

  it('fetches nothing, even from a spec that skipped the walk', () => {
    const fetch = jest.fn();
    stubGlobal('fetch', fetch);
    const input = vega({
      data: [{ name: 't', url: 'https://example.com/data.json' }],
      marks: [
        {
          type: 'image',
          encode: { enter: { url: { signal: "'https://example.com/a.png'" } } },
        },
      ],
    });
    const view = createVegaView(input.spec);
    view.run();
    view.finalize();
    expect(draw(input)).not.toContain('example.com');
    expect(fetch).not.toHaveBeenCalled();
  });

  describe('drops what a signal or data sets past the spec walk', () => {
    const hostile = (encode: SpecObject) => {
      const svg = draw(marks(encode));
      expect(svg).not.toMatch(/<a[\s>]|href="[^"]|javascript:|evil|url\(/i);
      return svg;
    };

    it.each([
      ['a link from data', { href: { field: 'link' } }],
      ['a link from a signal', { href: { signal: "'https://evil.example/link'" } }],
      ['a fill that fetches', { fill: { value: 'url(https://evil/x#p)' } }],
      ['an escaped fill', { fill: { value: 'u\\72l(https://evil/x)' } }],
      ['a stroke image set', { stroke: { value: 'image-set("https://evil")' } }],
      [
        'a blend that breaks out of its style',
        { blend: { value: 'multiply; background: url(https://evil)' } },
      ],
      ['a cursor image', { cursor: { value: 'url(https://evil/c.png), auto' } }],
    ])('%s', (_name, encode) => {
      hostile(encode);
    });
  });

  it.each([
    ['a literal', { background: 'url(https://evil/bg.svg#p)' }],
    ['a signal', { background: { signal: "'url(https://evil/bg.svg#p)'" } }],
    ['a config default', { config: { background: 'url(https://evil/bg.svg#p)' } }],
  ])('draws no background that fetches, set by %s', (_name, extra) => {
    const svg = draw(vega({ ...marks({}).spec, ...extra }));
    expect(svg).not.toMatch(/evil|url\((?!#)/);
  });

  it.each([
    ['text', { text: { value: '</text><script>alert(1)</script>' } }],
    ['a font', { font: { value: '"><script>alert(1)</script>' } }],
    ['a fill', { fill: { value: '"><script>alert(1)</script>' } }],
    ['a description', { description: { value: '"><script>alert(1)</script>' } }],
  ])('escapes markup in %s', (_name, encode) => {
    const svg = draw(marks(encode));
    expect(svg).not.toContain('<script');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('keeps a background and an author colour that fetch nothing', () => {
    const svg = draw(marks({ fill: { value: 'rgb(1, 2, 3)' }, blend: { value: 'multiply' } }));
    expect(svg).toContain('fill="rgb(1, 2, 3)"');
    expect(svg).toContain('mix-blend-mode: multiply;');
  });
});
