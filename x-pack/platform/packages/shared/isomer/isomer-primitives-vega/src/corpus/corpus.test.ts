/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stubGlobal, unstubAllGlobals } from '../test_helpers/stub_global';

import { createVegaView, renderVegaSvg, toVegaSpec, VegaRenderError } from '../render';
import { specIssues, type SpecObject } from '../spec';
import { vegaLightTheme } from '../theme';

import { kibanaSpecs } from './kibana.fixtures';
import type { CorpusSpec } from './types';
import { vegaSpecs } from './vega.fixtures';
import { vegaLiteSpecs } from './vega_lite.fixtures';

const SIZE = { width: 480, height: 300 };

/** The drawing without the root tag, which the pack resizes, and with def ids unnumbered. */
const drawing = (svg: string) =>
  svg
    .replace(/^<svg[^>]*>/, '')
    .replace(/(id="|url\(#)(?:isomer-vega-[a-z0-9]+-)?((?:p_)?gradient_|clip)\d+/g, '$1$2N');

/**
 * Vega's own output: `view.toSVG()` through the interpreter. The code generator is not compared:
 * it compiles with `new Function`, which Kibana disallows.
 */
const reference = async (vegaSpec: SpecObject) => {
  const view = createVegaView(vegaSpec);
  try {
    return await view.toSVG();
  } finally {
    view.finalize();
  }
};

const corpus: [string, CorpusSpec[]][] = [
  ['Vega-Lite', vegaLiteSpecs],
  ['Vega', vegaSpecs],
  ['Kibana', kibanaSpecs],
];

describe.each(corpus)('the %s corpus', (_source, specs) => {
  const fetch = jest.fn();
  beforeAll(() => {
    stubGlobal('fetch', fetch);
  });
  afterAll(() => {
    unstubAllGlobals();
    expect(fetch).not.toHaveBeenCalled();
  });

  const drawn = specs.filter(({ fails }) => fails === undefined);
  const failing = specs.filter(({ fails }) => fails !== undefined);

  it.each(drawn.map((entry) => [entry.name, entry] as const))(
    '%s draws, as Vega itself does',
    async (_name, { mode, spec, random }) => {
      expect(specIssues(spec)).toEqual([]);
      const vegaSpec = toVegaSpec({ mode, spec, ...SIZE }, vegaLightTheme);
      const { svg } = renderVegaSvg(vegaSpec, SIZE);
      // A data mark group with at least one item, not just axes.
      expect(svg).toMatch(/class="mark-[a-z]+ role-mark[^"]*"[^>]*><(?!\/g>)/);
      if (random) {
        return;
      }
      expect(renderVegaSvg(vegaSpec, SIZE).svg).toBe(svg);
      expect(drawing(await reference(vegaSpec))).toBe(drawing(svg));
    }
  );

  // `it.each` fails on an empty table.
  if (failing.length === 0) {
    return;
  }

  it.each(failing.map((entry) => [entry.name, entry] as const))(
    '%s fails headless as recorded',
    (_name, { mode, spec, fails }) => {
      const render = () => renderVegaSvg(toVegaSpec({ mode, spec, ...SIZE }, vegaLightTheme), SIZE);
      expect(render).toThrow(VegaRenderError);
      expect(render).toThrow(fails);
    }
  );
});
