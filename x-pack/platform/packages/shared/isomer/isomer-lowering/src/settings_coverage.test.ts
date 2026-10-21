/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every saved setting the lowering meets is applied as Kibana applies it, or named here with why not. A setting the
// repository's saved objects use that is in neither list fails, so a new one is a decision, not a silent drop.

import { corpusObjects } from './corpus.test_helpers';

const DATATABLE = {
  applied: ['columns', 'columnOrder', 'layerId', 'layerType', 'sorting'],
  notApplied: {
    rowHeight: 'rows draw at the table’s single-line height (request: table density)',
    rowHeightLines: 'custom row heights draw at the table’s single-line height',
    headerRowHeight: 'the header draws at one line',
    headerRowHeightLines: 'the header draws at one line',
    paging: 'a static table shows the rows that fit, not a page of them',
    density: 'the table draws at its default density',
  } as Record<string, string>,
};

const DATATABLE_COLUMN = {
  applied: ['columnId', 'alignment', 'colorMode', 'palette', 'width', 'hidden'],
  notApplied: {
    summaryRow: 'the table primitive has no summary row (request: table summary row)',
    summaryLabel: 'the table primitive has no summary row (request: table summary row)',
    font: 'cells draw in the body font (request: table column font)',
    isTransposed:
      'a transposed column is drawn as a regular column (diagnostic lens.datatable.transposed-column-flattened)',
    oneClickFilter: 'filtering by click is interactive',
    collapseFn: 'collapsed columns draw uncollapsed',
    colorMapping: 'categorical color mapping draws uncolored',
    isMetric: 'text-based metric columns draw as regular columns',
  } as Record<string, string>,
};

const LEGACY_MARKDOWN = {
  applied: ['markdown', 'fontSize'],
  notApplied: { openLinksInNewTab: 'a printed link opens nowhere' } as Record<string, string>,
};

const MAP_STYLE = {
  applied: [
    'fillColor',
    'lineColor',
    'lineWidth',
    'iconSize',
    'labelText',
    'labelColor',
    'labelSize',
    'labelPosition',
    'labelZoomRange',
    'symbolizeAs',
  ],
  notApplied: {
    icon: 'markers draw as circles; an icon is named in the outcome’s notes',
    iconOrientation: 'circles have no orientation',
    labelBorderColor: 'label halos are not drawn, and the outcome says so',
    labelBorderSize: 'label halos are not drawn, and the outcome says so',
  } as Record<string, string>,
};

/** Every Lens state in the corpus: saved Lens objects, and Lens panels held by value on dashboards. */
const lensStates = (): Array<{ visualizationType?: string; state?: Record<string, unknown> }> => [
  ...corpusObjects(['lens'], 'visualizationType').map(({ attributes }) => attributes),
  ...corpusObjects(['dashboard'], 'panelsJSON').flatMap(({ attributes }) => {
    try {
      return (
        JSON.parse(String(attributes.panelsJSON ?? '[]')) as Array<{
          embeddableConfig?: { attributes?: Record<string, unknown> };
        }>
      ).flatMap(({ embeddableConfig }) =>
        embeddableConfig?.attributes ? [embeddableConfig.attributes] : []
      );
    } catch {
      return [];
    }
  }),
];

const unknownKeys = (
  seen: Iterable<string>,
  { applied, notApplied }: { applied: string[]; notApplied: Record<string, string> }
) => [...new Set(seen)].filter((key) => !applied.includes(key) && !(key in notApplied)).sort();

describe('saved settings the lowering meets', () => {
  it('applies or names every data table setting', () => {
    const visualization: string[] = [];
    const column: string[] = [];
    for (const lens of lensStates()) {
      const state =
        lens.visualizationType === 'lnsDatatable'
          ? (lens.state?.visualization as Record<string, unknown>)
          : undefined;
      if (!state) continue;
      visualization.push(...Object.keys(state));
      for (const config of (state.columns as Array<Record<string, unknown>> | undefined) ?? []) {
        column.push(...Object.keys(config));
      }
    }
    expect(column.length).toBeGreaterThan(0);
    expect({
      visualization: unknownKeys(visualization, DATATABLE),
      column: unknownKeys(column, DATATABLE_COLUMN),
    }).toEqual({ visualization: [], column: [] });
  });

  it('applies or names every legacy Markdown setting', () => {
    const params: string[] = [];
    for (const { attributes } of corpusObjects(['visualization'], 'markdown')) {
      try {
        const visState = JSON.parse(String(attributes.visState));
        if (visState.type === 'markdown') params.push(...Object.keys(visState.params ?? {}));
      } catch {
        // Not every corpus visualization's state parses; those aren't Markdown.
      }
    }
    expect(params.length).toBeGreaterThan(0);
    expect(unknownKeys(params, LEGACY_MARKDOWN)).toEqual([]);
  });

  it('applies or names every Maps vector style property', () => {
    const properties: string[] = [];
    for (const { attributes } of corpusObjects(['map'], 'layerListJSON')) {
      try {
        for (const layer of JSON.parse(String(attributes.layerListJSON)) as Array<{
          style?: { type?: string; properties?: Record<string, unknown> };
        }>) {
          if (layer.style?.type === 'VECTOR')
            properties.push(...Object.keys(layer.style.properties ?? {}));
        }
      } catch {
        // A corpus map whose layer list doesn't parse has no styles to check.
      }
    }
    expect(properties.length).toBeGreaterThan(0);
    expect(unknownKeys(properties, MAP_STYLE)).toEqual([]);
  });
});
