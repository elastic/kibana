/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import {
  VEGA_REFERENCE_EXAMPLES,
  buildReferenceExamplesBlock,
  createExampleSelectorPrompt,
  formatReferenceCatalog,
  formatReferenceExamples,
  loadReferenceExamples,
  selectReferenceExamples,
} from './reference_examples';

/**
 * Build a mock ScopedModel whose structured-output selector returns `exampleIds`
 * (or throws, to exercise the fail-open path).
 */
const mockModel = (
  result: { exampleIds?: string[] } | (() => never)
): { model: ScopedModel; invoke: jest.Mock; withStructuredOutput: jest.Mock } => {
  const invoke = jest.fn(async () => {
    if (typeof result === 'function') {
      return result();
    }
    return result;
  });
  const withStructuredOutput = jest.fn(() => ({ invoke }));
  return {
    model: { chatModel: { withStructuredOutput } } as unknown as ScopedModel,
    invoke,
    withStructuredOutput,
  };
};

const mockLogger = (): Logger => ({ warn: jest.fn() } as unknown as Logger);

const fixedColorPaths = (node: unknown, path = '$'): string[] => {
  if (Array.isArray(node)) {
    return node.flatMap((item, index) => fixedColorPaths(item, `${path}[${index}]`));
  }
  if (!node || typeof node !== 'object') {
    return [];
  }
  const entries = Object.entries(node as Record<string, unknown>);
  const here: string[] = [];
  const mark = (node as Record<string, unknown>).mark;
  if (
    mark &&
    typeof mark === 'object' &&
    typeof (mark as Record<string, unknown>).color === 'string'
  ) {
    here.push(`${path}.mark.color`);
  }
  if ('config' in (node as Record<string, unknown>)) {
    here.push(`${path}.config`);
  }
  return here.concat(entries.flatMap(([key, value]) => fixedColorPaths(value, `${path}.${key}`)));
};

const idsFor = async (result: { exampleIds?: string[] }): Promise<string[]> => {
  const { model } = mockModel(result);
  const selected = await selectReferenceExamples({ nlQuery: 'any request', model });
  return selected.map((example) => example.id);
};

describe('formatReferenceCatalog', () => {
  it('lists every example id, title and description (no spec bodies)', () => {
    const catalog = formatReferenceCatalog();
    for (const example of VEGA_REFERENCE_EXAMPLES) {
      expect(catalog).toContain(`id: "${example.id}"`);
      expect(catalog).toContain(example.title);
    }
    // A selection catalog must not carry heavy spec bodies.
    expect(catalog).not.toContain('$schema');
  });
});

describe('createExampleSelectorPrompt', () => {
  it('embeds the catalog, the request and the tool name', () => {
    const [system, human] = createExampleSelectorPrompt({ nlQuery: 'a heatmap by hour and day' });
    const systemText = String((system as [string, string])[1]);
    const humanText = String((human as [string, string])[1]);

    expect(systemText).toContain('select_reference_examples');
    expect(systemText).toContain('id: "heatmap"');
    expect(humanText).toContain('a heatmap by hour and day');
  });

  it('includes the chart-type hint only when provided', () => {
    const [, humanNoHint] = createExampleSelectorPrompt({ nlQuery: 'x' });
    expect(String((humanNoHint as [string, string])[1])).not.toContain('Suggested chart style');
  });
});

describe('selectReferenceExamples', () => {
  it('resolves the model-returned ids to catalog examples', async () => {
    expect(await idsFor({ exampleIds: ['scatter_bubble'] })).toEqual(['scatter_bubble']);
  });

  it('ignores ids that are not in the catalog', async () => {
    expect(await idsFor({ exampleIds: ['not_a_real_example', 'heatmap'] })).toEqual(['heatmap']);
  });

  it('dedupes repeated ids', async () => {
    expect(await idsFor({ exampleIds: ['heatmap', 'heatmap'] })).toEqual(['heatmap']);
  });

  it('caps the selection at two examples, preserving order', async () => {
    expect(
      await idsFor({
        exampleIds: ['layered_combo_dual_axis', 'faceted_small_multiples', 'scatter_bubble'],
      })
    ).toEqual(['layered_combo_dual_axis', 'faceted_small_multiples']);
  });

  it('returns nothing when the model selects no example (plain chart)', async () => {
    expect(await idsFor({ exampleIds: [] })).toEqual([]);
    expect(await idsFor({})).toEqual([]);
  });

  it('fails open to no examples (and warns) when the model call throws', async () => {
    const { model } = mockModel(() => {
      throw new Error('model unavailable');
    });
    const logger = mockLogger();

    const selected = await selectReferenceExamples({ nlQuery: 'x', model, logger });

    expect(selected).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('model unavailable'));
  });

  it('requests structured output under the select_reference_examples tool name', async () => {
    const { model, withStructuredOutput } = mockModel({ exampleIds: [] });
    await selectReferenceExamples({ nlQuery: 'x', model });
    expect(withStructuredOutput).toHaveBeenCalledWith(expect.anything(), {
      name: 'select_reference_examples',
    });
  });
});

describe('loadReferenceExamples', () => {
  it('materializes the spec body for each selected example', async () => {
    const [scatter] = VEGA_REFERENCE_EXAMPLES.filter((e) => e.id === 'scatter_bubble');
    const loaded = await loadReferenceExamples([scatter]);

    expect(loaded.map((example) => example.id)).toEqual(['scatter_bubble']);
    expect(loaded[0].spec.$schema).toBe('https://vega.github.io/schema/vega-lite/v6.json');
  });

  it('loads nothing when no examples are selected', async () => {
    expect(await loadReferenceExamples([])).toEqual([]);
  });
});

describe('buildReferenceExamplesBlock', () => {
  it('selects, loads and formats the matched examples into a prompt block', async () => {
    const { model } = mockModel({ exampleIds: ['scatter_bubble'] });
    const block = await buildReferenceExamplesBlock({ nlQuery: 'scatter of x vs y', model });

    expect(block).toContain('REFERENCE EXAMPLES');
    expect(block).toContain('Scatter / bubble plot (encoded size)');
    expect(block).toContain('```json');
  });

  it('returns an empty string when the model selects nothing (no bodies loaded)', async () => {
    const { model } = mockModel({ exampleIds: [] });
    expect(await buildReferenceExamplesBlock({ nlQuery: 'top 10 services', model })).toBe('');
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

  it('never hardcodes colors, so every example stays theme-aware in dark mode', async () => {
    for (const example of VEGA_REFERENCE_EXAMPLES) {
      const spec = await example.load();
      const serialized = JSON.stringify(spec);

      expect(serialized).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(fixedColorPaths(spec)).toEqual([]);
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
    const [scatter] = VEGA_REFERENCE_EXAMPLES.filter((e) => e.id === 'scatter_bubble');
    const rendered = formatReferenceExamples(await loadReferenceExamples([scatter]));
    expect(rendered).toContain('REFERENCE EXAMPLES');
    expect(rendered).toContain('Scatter / bubble plot (encoded size)');
    expect(rendered).toContain('```json');
    expect(rendered).toContain('Do NOT copy their data source');
  });
});
