/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { lensPanelContentSchema, readsDataVegaEditsCannotKeep, vegaPanelContentSchema } from '.';

const baseRequest = {
  type: 'vis' as const,
  query: 'show total requests',
};

describe('visualization panel content schemas', () => {
  it.each([
    ['with', { chartType: SupportedChartType.Metric }],
    ['without', {}],
  ])('accepts Lens content %s chartType', (_, fields) => {
    expect(lensPanelContentSchema.safeParse({ ...baseRequest, ...fields }).success).toBe(true);
  });

  it('allows Vega content without a chartType hint', () => {
    expect(vegaPanelContentSchema.safeParse({ ...baseRequest, type: 'vega' }).success).toBe(true);
  });

  it('does not accept applyChartRules on Vega content', () => {
    const result = vegaPanelContentSchema.safeParse({
      ...baseRequest,
      type: 'vega',
      applyChartRules: true,
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('applyChartRules');
  });
});

describe('readsDataVegaEditsCannotKeep', () => {
  const esqlUrl = { '%type%': 'esql', query: 'FROM logs | STATS count = COUNT(*) BY host' };
  const dslUrl = { index: 'logs', body: { size: 0 } };

  const grid = { x: 0, y: 0, w: 24, h: 15 };
  const vegaPanel = (spec: object | string): AttachmentPanel => ({
    id: 'vega-1',
    type: VEGA_VIS_TYPE,
    config: { spec },
    grid,
  });

  it.each([
    ['a top-level ES|QL source', { data: { url: esqlUrl }, mark: 'bar' }],
    [
      'the ES|QL source the Vega author writes',
      { data: { url: { ...esqlUrl, '%context%': true } }, mark: 'bar' },
    ],
    ['no data source', { mark: 'bar' }],
    [
      'a lookup from another source',
      {
        data: { url: esqlUrl },
        transform: [{ lookup: 'host', from: { data: { url: dslUrl }, key: 'host' } }],
        mark: 'bar',
      },
    ],
    [
      'an image mark url next to a top-level ES|QL source',
      {
        data: { url: esqlUrl },
        mark: { type: 'image', url: { signal: 'datum.icon' } },
        encoding: { url: { field: 'icon' } },
      },
    ],
    [
      'a layer without its own data',
      { data: { url: esqlUrl }, layer: [{ mark: 'bar' }, { mark: 'rule' }] },
    ],
  ])('keeps a Vega panel with %s editable', (_, spec) => {
    expect(readsDataVegaEditsCannotKeep(vegaPanel(spec))).toBe(false);
  });

  it.each([
    ['a top-level Query DSL source', { data: { url: dslUrl }, mark: 'bar' }],
    [
      'an emsfile map source',
      { data: { url: { '%type%': 'emsfile', name: 'World Countries' } }, mark: 'geoshape' },
    ],
    ['an external url', { data: { url: 'https://example.com/data.json' }, mark: 'bar' }],
    ['a Vega data array', { data: [{ name: 'table', url: esqlUrl }], marks: [] }],
    [
      'a layer with its own Query DSL source',
      { data: { url: esqlUrl }, layer: [{ mark: 'bar' }, { data: { url: dslUrl }, mark: 'rule' }] },
    ],
    [
      'a layer with its own ES|QL source',
      {
        data: { url: esqlUrl },
        layer: [{ mark: 'bar' }, { data: { url: esqlUrl }, mark: 'rule' }],
      },
    ],
    ['inline values', { data: { values: [{ a: 1 }] }, mark: 'bar' }],
    [
      'a named source next to its ES|QL url',
      { data: { name: 'table', url: esqlUrl }, mark: 'bar' },
    ],
    [
      'a format on its ES|QL source',
      { data: { url: esqlUrl, format: { type: 'json' } }, mark: 'bar' },
    ],
    [
      'an ES|QL source without the dashboard context',
      { data: { url: { ...esqlUrl, '%context%': false } }, mark: 'bar' },
    ],
    [
      'an ES|QL source with a time field',
      { data: { url: { ...esqlUrl, '%timefield%': '@timestamp' } }, mark: 'bar' },
    ],
    [
      'a layer with inline values',
      {
        data: { url: esqlUrl },
        layer: [{ mark: 'bar' }, { data: { values: [{ y: 10 }] }, mark: 'rule' }],
      },
    ],
  ])('blocks edits of a Vega panel with %s', (_, spec) => {
    expect(readsDataVegaEditsCannotKeep(vegaPanel(spec))).toBe(true);
  });

  it('reads the HJSON spec Kibana stores', () => {
    expect(
      readsDataVegaEditsCannotKeep(
        vegaPanel(`{
          // a comment
          data: {
            url: {
              index: logs
              body: { size: 0 }
            }
          }
          mark: bar
        }`)
      )
    ).toBe(true);
    expect(
      readsDataVegaEditsCannotKeep(
        vegaPanel(`{
          data: {
            url: {
              %type%: esql
              query: FROM logs
            }
          }
          mark: bar
        }`)
      )
    ).toBe(false);
  });

  it('blocks edits of a Vega panel whose spec does not parse', () => {
    expect(readsDataVegaEditsCannotKeep(vegaPanel('{ data: { url: '))).toBe(true);
  });

  it('ignores panels that are not Vega', () => {
    expect(
      readsDataVegaEditsCannotKeep({
        id: 'lens-1',
        type: LENS_EMBEDDABLE_TYPE,
        config: { spec: { data: { url: dslUrl } } },
        grid,
      })
    ).toBe(false);
  });
});
