/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import lensDatatable from '../../__fixtures__/lens_datatable.json';
import { fromKibanaSavedObject } from '..';

describe('fromKibanaSavedObject (Datatable)', () => {
  it('lowers an lnsDatatable saved object to AdaptiveLens(chart.kind = "datatable")', () => {
    const { lens, diagnostics } = fromKibanaSavedObject(lensDatatable, {
      resolveReferenceTitle: () => 'web-*',
    });
    expect(lens).toBeDefined();
    expect(lens?.chart.kind).toBe('datatable');

    if (lens?.chart.kind === 'datatable') {
      expect(lens.chart.columns.map((c) => c.id)).toEqual(['col-path', 'col-count', 'col-p95']);
      expect(lens.chart.columns[0]?.align).toBe('left');
      expect(lens.chart.columns[0]?.font).toBeUndefined();
      expect(lens.chart.columns[1]?.align).toBe('right');
      expect(lens.chart.columns[1]?.font).toBe('monospace');
      expect(lens.chart.sort).toEqual({
        column: 'col-count',
        direction: 'desc',
      });
    }

    expect(diagnostics.find((d) => d.code === 'lens.formBased.lowered-to-esql')).toBeDefined();
    expect(lens?.query.esql).toContain('FROM `web-*`');
    expect(lens?.query.esql).toContain('SORT `col-count` DESC');
    expect(lens?.query.esql).toContain('LIMIT 20');
  });

  it('reports a table whose config hides every column instead of re-exposing them', () => {
    // An empty visible set used to read as "no visibility metadata", which
    // fell back to the layer order and painted every hidden column.
    const allHidden = JSON.parse(JSON.stringify(lensDatatable));
    for (const column of allHidden.attributes.state.visualization.columns) {
      column.hidden = true;
    }
    const { lens, diagnostics } = fromKibanaSavedObject(allHidden, {
      resolveReferenceTitle: () => 'web-*',
    });

    expect(lens).toBeUndefined();
    expect(diagnostics.find((d) => d.code === 'lens.datatable.no-columns')).toBeDefined();
  });

  it('omits a table sort that names a column the table does not show', () => {
    // `TableNode.sort.column` must name one of `TableNode.columns`; a sort
    // pointing at a hidden ranking metric failed schema validation.
    const hiddenSort = JSON.parse(JSON.stringify(lensDatatable));
    for (const column of hiddenSort.attributes.state.visualization.columns) {
      if (column.columnId === 'col-count') {
        column.hidden = true;
      }
    }
    const { lens, diagnostics } = fromKibanaSavedObject(hiddenSort, {
      resolveReferenceTitle: () => 'web-*',
    });

    expect(lens?.chart.kind).toBe('datatable');
    if (lens?.chart.kind === 'datatable') {
      expect(lens.chart.columns.map((c) => c.id)).not.toContain('col-count');
      expect(lens.chart.sort).toBeUndefined();
    }
    expect(diagnostics.find((d) => d.code === 'lens.datatable.sort-column-hidden')).toBeDefined();
    // The ordering itself is not lost — the query still carries it.
    expect(lens?.query.esql).toContain('SORT `col-count` DESC');
  });

  it('defaults numeric columns to right alignment when Lens omits alignment', () => {
    const unaligned = JSON.parse(JSON.stringify(lensDatatable));
    for (const column of unaligned.attributes.state.visualization.columns) {
      delete column.alignment;
    }
    const { lens } = fromKibanaSavedObject(unaligned, {
      resolveReferenceTitle: () => 'web-*',
    });
    expect(lens?.chart.kind).toBe('datatable');
    if (lens?.chart.kind === 'datatable') {
      expect(lens.chart.columns[0]?.align).toBeUndefined();
      expect(lens.chart.columns[1]?.align).toBe('right');
      expect(lens.chart.columns[2]?.align).toBe('right');
    }
  });

  it('lowers a textBased (ES|QL) datatable, mapping columns and sort to fieldName', () => {
    const textBasedDatatable = {
      id: 'lens-dt-textbased',
      type: 'lens',
      attributes: {
        title: 'Errors by host',
        visualizationType: 'lnsDatatable',
        state: {
          datasourceStates: {
            textBased: {
              layers: {
                'layer-1': {
                  index: 'idx',
                  query: {
                    esql: 'FROM logs | STATS Unique = COUNT_DISTINCT(clientip), c5 = COUNT(*) BY `url.keyword` | RENAME c5 as `HTTP 5xx`',
                  },
                  columns: [
                    { columnId: 'col-unique', fieldName: 'Unique' },
                    {
                      columnId: 'col-5xx',
                      fieldName: 'HTTP 5xx',
                      params: {
                        format: { id: 'percent', params: { decimals: 1 } },
                      },
                    },
                    { columnId: 'col-url', fieldName: 'url.keyword' },
                  ],
                  timeField: '@timestamp',
                },
              },
            },
          },
          visualization: {
            layerId: 'layer-1',
            layerType: 'data',
            columns: [{ columnId: 'col-unique' }, { columnId: 'col-5xx' }, { columnId: 'col-url' }],
            sorting: { columnId: 'col-5xx', direction: 'desc' },
          },
        },
      },
    };

    const { lens } = fromKibanaSavedObject(textBasedDatatable);
    expect(lens?.chart.kind).toBe('datatable');
    if (lens?.chart.kind === 'datatable') {
      expect(lens.chart.columns.map((c) => c.id)).toEqual(['Unique', 'HTTP 5xx', 'url.keyword']);
      const percentCol = lens.chart.columns.find((c) => c.id === 'HTTP 5xx');
      expect(percentCol?.format).toEqual({ kind: 'percent', precision: 1 });
      expect(lens.chart.sort).toEqual({
        column: 'HTTP 5xx',
        direction: 'desc',
      });
    }
  });

  it('reads colorMode + palette stops onto column.colorScale', () => {
    // Patch the fixture to give the count column a Lens-style heat palette.
    const heat = JSON.parse(JSON.stringify(lensDatatable));
    const countCfg = heat.attributes.state.visualization.columns.find(
      (c: { columnId: string }) => c.columnId === 'col-count'
    );
    countCfg.colorMode = 'cell';
    countCfg.palette = {
      params: {
        rangeType: 'percent',
        stops: [
          { stop: 0.0, color: '#e0e0e0' },
          { stop: 50, color: '#f6b26b' },
          { stop: 100, color: '#cc0000' },
        ],
      },
    };
    const { lens, diagnostics } = fromKibanaSavedObject(heat, {
      resolveReferenceTitle: () => 'web-*',
    });
    if (lens?.chart.kind === 'datatable') {
      const column = lens.chart.columns.find((c) => c.id === 'col-count');
      expect(column?.colorScale?.mode).toBe('cell');
      expect(column?.colorScale?.stops.length).toBeGreaterThan(0);
      expect(column?.colorScale?.stops[1]?.at).toBe(0.5);
      expect(column?.colorScale?.stops[1]?.color).toBe('#f6b26b');
      expect(column?.font).toBe('monospace');
    }
    expect(
      diagnostics.find((d) => d.code === 'lens.datatable.color-palette-preserved')
    ).toBeDefined();
  });

  it('drops colorMode === "none" cleanly with no colorScale', () => {
    const noHeat = JSON.parse(JSON.stringify(lensDatatable));
    const countCfg = noHeat.attributes.state.visualization.columns.find(
      (c: { columnId: string }) => c.columnId === 'col-count'
    );
    countCfg.colorMode = 'none';
    const { lens } = fromKibanaSavedObject(noHeat, {
      resolveReferenceTitle: () => 'web-*',
    });
    if (lens?.chart.kind === 'datatable') {
      const column = lens.chart.columns.find((c) => c.id === 'col-count');
      expect(column?.colorScale).toBeUndefined();
    }
  });

  it('preserves row density and explicit column font hints', () => {
    const configured = JSON.parse(JSON.stringify(lensDatatable));
    configured.attributes.state.visualization.rowHeight = 'single';
    configured.attributes.state.visualization.columns[0].font = 'monospace';

    const { lens } = fromKibanaSavedObject(configured, {
      resolveReferenceTitle: () => 'web-*',
    });

    expect(lens?.chart.kind).toBe('datatable');
    if (lens?.chart.kind === 'datatable') {
      expect(lens.chart.density).toBe('compact');
      expect(lens.chart.columns[0]?.font).toBe('monospace');
    }
  });

  it('lowers a column-level timeShift into a distinct, bucket-aligned aggregation', () => {
    const comparison = JSON.parse(JSON.stringify(lensDatatable));
    const layer = comparison.attributes.state.datasourceStates.formBased.layers['layer-1'] as {
      columns: Record<string, unknown>;
      columnOrder: string[];
    };
    // Replace the terms bucket with a daily date histogram and add a
    // "1 week ago" metric alongside the current one.
    layer.columns = {
      'col-date': {
        operationType: 'date_histogram',
        sourceField: 'order_date',
        isBucketed: true,
        dataType: 'date',
        params: { interval: '1d' },
        label: 'order_date',
      },
      'col-now': {
        operationType: 'sum',
        sourceField: 'taxful_total_price',
        isBucketed: false,
        dataType: 'number',
        label: 'This week',
      },
      'col-prev': {
        operationType: 'sum',
        sourceField: 'taxful_total_price',
        isBucketed: false,
        dataType: 'number',
        timeShift: '1w',
        label: '1 week ago',
      },
    };
    layer.columnOrder = ['col-date', 'col-now', 'col-prev'];
    comparison.attributes.state.visualization.columns = [
      { columnId: 'col-date', alignment: 'left' },
      { columnId: 'col-now', alignment: 'right' },
      { columnId: 'col-prev', alignment: 'right' },
    ];
    comparison.attributes.state.visualization.sorting = {};

    const { lens } = fromKibanaSavedObject(comparison, {
      resolveReferenceTitle: () => 'kibana_sample_data_ecommerce',
      timeRange: { from: 'now-7d', to: 'now' },
    });

    const esql = lens?.query.esql ?? '';
    // The two columns must resolve to different windows, not the same agg.
    expect(esql).toMatch(
      /`?col-now`? = SUM\(taxful_total_price\) WHERE order_date >= NOW\(\) - 7 day AND order_date < NOW\(\)/
    );
    expect(esql).toMatch(
      /`?col-prev`? = SUM\(taxful_total_price\) WHERE order_date >= NOW\(\) - 7 day - 1 week AND order_date < NOW\(\) - 1 week/
    );
    // Past rows are pulled forward by the shift so they share a bucket.
    expect(esql).toMatch(
      /BUCKET\(CASE\(order_date >= NOW\(\) - 7 day, order_date, order_date \+ 1 week\), 1d\)/
    );
    expect(esql).toMatch(
      /FROM kibana_sample_data_ecommerce \| WHERE order_date >= NOW\(\) - 7 day - 1 week AND order_date < NOW\(\)/
    );
  });

  it('emits a static_value column as a post-STATS literal instead of failing', () => {
    const withStatic = JSON.parse(JSON.stringify(lensDatatable));
    const layer = withStatic.attributes.state.datasourceStates.formBased.layers['layer-1'];
    layer.columns['col-target'] = {
      operationType: 'static_value',
      isBucketed: false,
      dataType: 'number',
      params: { value: 100 },
      label: 'Target',
    };
    layer.columnOrder = ['col-path', 'col-count', 'col-p95', 'col-target'];
    withStatic.attributes.state.visualization.columns.push({
      columnId: 'col-target',
      alignment: 'right',
    });

    const { lens, diagnostics } = fromKibanaSavedObject(withStatic, {
      resolveReferenceTitle: () => 'web-*',
    });

    expect(lens).toBeDefined();
    const esql = lens?.query.esql ?? '';
    expect(esql).toMatch(/EVAL[^|]*`?col-target`? = 100\.0/);
    expect(
      diagnostics.find((d) => d.code === 'lens.formBased.unsupported-operation')
    ).toBeUndefined();
  });

  it('preserves summary row configuration', () => {
    const configured = JSON.parse(JSON.stringify(lensDatatable));
    configured.attributes.state.visualization.columns[0].summaryLabel = 'Total';
    configured.attributes.state.visualization.columns[1].summaryRow = 'sum';

    const { lens } = fromKibanaSavedObject(configured, {
      resolveReferenceTitle: () => 'web-*',
    });

    expect(lens?.chart.kind).toBe('datatable');
    if (lens?.chart.kind === 'datatable') {
      expect(lens.chart.columns[0]?.summary).toEqual({
        function: 'count',
        label: 'Total',
      });
      expect(lens.chart.columns[1]?.summary).toEqual({ function: 'sum' });
    }
  });

  it('ranks by terms orderBy when visualization.sorting is absent', () => {
    const ranked = JSON.parse(JSON.stringify(lensDatatable));
    delete ranked.attributes.state.visualization.sorting;
    ranked.attributes.state.datasourceStates.formBased.layers['layer-1'].columns[
      'col-path'
    ].params = {
      size: 10,
      orderBy: { columnId: 'col-count' },
      orderDirection: 'desc',
    };

    const { lens } = fromKibanaSavedObject(ranked, {
      resolveReferenceTitle: () => 'web-*',
    });

    expect(lens?.chart.kind).toBe('datatable');
    if (lens?.chart.kind === 'datatable') {
      expect(lens.chart.sort).toEqual({
        column: 'col-count',
        direction: 'desc',
      });
    }
    expect(lens?.query.esql).toContain('SORT `col-count` DESC');
    expect(lens?.query.esql).toContain('LIMIT 10');
  });

  it('prefers visualization.columnOrder for visible columns', () => {
    const reordered = JSON.parse(JSON.stringify(lensDatatable));
    reordered.attributes.state.visualization.columnOrder = ['col-count', 'col-path', 'col-p95'];

    const { lens } = fromKibanaSavedObject(reordered, {
      resolveReferenceTitle: () => 'web-*',
    });

    expect(lens?.chart.kind).toBe('datatable');
    if (lens?.chart.kind === 'datatable') {
      expect(lens.chart.columns.map((column) => column.id)).toEqual([
        'col-count',
        'col-path',
        'col-p95',
      ]);
    }
  });

  it('falls back to the form-based layer columnOrder when visualization.columnOrder is absent', () => {
    const reordered = JSON.parse(JSON.stringify(lensDatatable));
    const layer = reordered.attributes.state.datasourceStates.formBased.layers['layer-1'];
    layer.columnOrder = ['col-p95', 'col-path', 'col-count'];
    reordered.attributes.state.visualization.columns = [
      { columnId: 'col-path' },
      { columnId: 'col-count' },
      { columnId: 'col-p95' },
    ];

    const { lens } = fromKibanaSavedObject(reordered, {
      resolveReferenceTitle: () => 'web-*',
    });

    expect(lens?.chart.kind).toBe('datatable');
    if (lens?.chart.kind === 'datatable') {
      expect(lens.chart.columns.map((column) => column.id)).toEqual([
        'col-p95',
        'col-path',
        'col-count',
      ]);
    }
  });
});
