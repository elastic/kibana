/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  VEGA_REFERENCE_EXAMPLES,
  formatReferenceExamples,
  loadReferenceExamples,
  selectReferenceExamples,
} from './reference_examples';

const idsFor = (nlQuery: string): string[] =>
  selectReferenceExamples(nlQuery).map((example) => example.id);

describe('selectReferenceExamples', () => {
  it('selects the combination example for a bar + overlaid line request', () => {
    expect(
      idsFor('bars of daily request count with an overlaid line of average response time')
    ).toContain('layered_combo_dual_axis');
  });

  it('selects the faceted example for a small-multiples request', () => {
    expect(idsFor('small multiples of p95 latency over time, one panel per service')).toContain(
      'faceted_small_multiples'
    );
  });

  it('selects the scatter example for a scatter/bubble request', () => {
    expect(
      idsFor('scatter of latency vs throughput per host, bubble size = error count')
    ).toContain('scatter_bubble');
  });

  it('selects the heatmap example for a heatmap request', () => {
    expect(idsFor('a heatmap of activity by hour and day')).toContain('heatmap');
  });

  it('returns no example for a plain single-series chart (routes to Lens)', () => {
    expect(selectReferenceExamples('top 10 services by error count as a bar chart')).toEqual([]);
  });

  it('is case-insensitive', () => {
    expect(idsFor('SCATTER of X VS Y')).toContain('scatter_bubble');
  });

  it('ranks the higher-scoring example first', () => {
    // Matches scatter strongly (scatter, vs, bubble size) and faceted weakly.
    const [first] = idsFor('scatter plot of latency vs throughput, bubble size by errors');
    expect(first).toBe('scatter_bubble');
  });

  it('never returns more than two examples', () => {
    const many = selectReferenceExamples(
      'a combination bar and line dual-axis scatter bubble heatmap small multiples facet chart'
    );
    expect(many.length).toBeLessThanOrEqual(2);
  });

  it('selection is stateless across repeated calls (no global-regex lastIndex drift)', () => {
    const first = idsFor('scatter of latency vs throughput');
    const second = idsFor('scatter of latency vs throughput');
    expect(second).toEqual(first);
  });
});

describe('loadReferenceExamples', () => {
  it('materializes only the matched examples with their spec bodies', async () => {
    const loaded = await loadReferenceExamples('scatter of latency vs throughput');

    expect(loaded.map((example) => example.id)).toEqual(['scatter_bubble']);
    expect(loaded[0].spec.$schema).toBe('https://vega.github.io/schema/vega-lite/v6.json');
  });

  it('loads nothing for a plain single-series chart', async () => {
    expect(await loadReferenceExamples('top 10 services by error count')).toEqual([]);
  });
});

describe('reference example specs (loaded on demand)', () => {
  it.each(VEGA_REFERENCE_EXAMPLES.map((example) => [example.id, example] as const))(
    '%s is a guideline-compliant Vega-Lite v6 skeleton',
    async (_id, example) => {
      const spec = await example.load();

      expect(spec.$schema).toBe('https://vega.github.io/schema/vega-lite/v6.json');

      // Declares a renderable view.
      const hasView = ['mark', 'layer', 'facet', 'repeat', 'concat', 'hconcat', 'vconcat'].some(
        (key) => key in spec
      );
      expect(hasView).toBe(true);

      // Binds Kibana's inline ES|QL data source.
      const url = (spec.data as { url?: Record<string, unknown> })?.url;
      expect(url?.['%type%']).toBe('esql');
      expect(typeof url?.query).toBe('string');
    }
  );

  it('never sets a fixed size on a non-faceted top level (auto-sizes to the container)', async () => {
    for (const example of VEGA_REFERENCE_EXAMPLES) {
      const spec = await example.load();
      if ('facet' in spec) {
        // Faceting is the one case where per-cell width/height belong on the inner spec.
        const inner = spec.spec as Record<string, unknown>;
        expect(inner.width).toBeDefined();
        expect(inner.height).toBeDefined();
        expect(spec.columns).toBeDefined();
      } else {
        expect(spec.width).toBeUndefined();
        expect(spec.height).toBeUndefined();
        expect(spec.autosize).toEqual({ type: 'fit', contains: 'padding' });
      }
    }
  });

  it('escapes dotted field references and filters time on the raw source field', async () => {
    for (const example of VEGA_REFERENCE_EXAMPLES) {
      const spec = await example.load();
      const serialized = JSON.stringify(spec);
      // Any dotted field used in an encoding is backslash-escaped, never left raw.
      expect(serialized).not.toMatch(/"field":\s*"[a-z_]+\.[a-z_]+"/i);

      const url = (spec.data as { url?: Record<string, unknown> }).url ?? {};
      const query = String(url.query ?? '');
      if (query.includes('?_tstart')) {
        expect(query).toMatch(/WHERE @timestamp >= \?_tstart AND @timestamp < \?_tend/);
        expect(url['%timefield%']).toBe('@timestamp');
      }
    }
  });
});

describe('formatReferenceExamples', () => {
  it('returns an empty string when there are no examples', () => {
    expect(formatReferenceExamples([])).toBe('');
  });

  it('renders a titled JSON block per example and warns against copying data', async () => {
    const rendered = formatReferenceExamples(
      await loadReferenceExamples('scatter of x vs y')
    );
    expect(rendered).toContain('REFERENCE EXAMPLES');
    expect(rendered).toContain('Scatter / bubble plot (encoded size)');
    expect(rendered).toContain('```json');
    expect(rendered).toContain('Do NOT copy their data source');
  });
});
