/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { LensXYOverlayMatchContext } from '@kbn/lens-common';
import {
  createExemplarsOverlayProvider,
  getExemplarsQuery,
  isExemplarsQuery,
} from './exemplars_overlay_provider';

const TS_QUERY =
  'TS metrics-* | STATS value = PERCENTILE(http.server.request.duration, 95) BY TBUCKET(100)';

const LENS_CHILD_CONTEXT = { type: 'lens', name: 'lnsXY' };
const METRICS_GRID_CONTEXT = {
  type: 'discover',
  name: 'metrics_grid',
  description: 'metrics experience chart data',
  child: LENS_CHILD_CONTEXT,
};
const DISCOVER_HISTOGRAM_CONTEXT = {
  type: 'discover',
  name: 'unified_histogram',
  child: LENS_CHILD_CONTEXT,
};
const DASHBOARD_CONTEXT = {
  type: 'dashboard',
  description: 'My dashboard',
  child: LENS_CHILD_CONTEXT,
};

const getContext = (
  executionContext: LensXYOverlayMatchContext['executionContext'],
  esql: string = TS_QUERY
): LensXYOverlayMatchContext => ({
  layers: [{ layerId: 'layer1', esql }],
  executionContext,
});

const table: Datatable = {
  type: 'datatable',
  columns: [],
  rows: [
    { '@timestamp': '2026-11-06T11:24:00.890Z', value: 0.003, trace_id: 'abc' },
    { '@timestamp': 'not a date', value: 0.001 },
  ],
};

describe('isExemplarsQuery', () => {
  it('accepts a TS query with STATS', () => {
    expect(isExemplarsQuery(TS_QUERY)).toBe(true);
  });

  it('accepts a TS query with another SET instruction', () => {
    expect(isExemplarsQuery(`SET unmapped_fields="NULLIFY";\n${TS_QUERY}`)).toBe(true);
  });

  it('rejects a FROM query', () => {
    expect(isExemplarsQuery('FROM metrics-* | STATS AVG(bytes) BY BUCKET(@timestamp, 50)')).toBe(
      false
    );
  });

  it('rejects a TS query without STATS', () => {
    expect(isExemplarsQuery('TS metrics-* | LIMIT 10')).toBe(false);
  });

  it('rejects a query that already sets exemplars', () => {
    expect(isExemplarsQuery(`SET exemplars=true;\n${TS_QUERY}`)).toBe(false);
  });
});

describe('getExemplarsQuery', () => {
  it('prepends SET exemplars to the chart query', () => {
    expect(getExemplarsQuery(TS_QUERY)).toBe(`SET exemplars={"limit": 1000};\n${TS_QUERY}`);
  });
});

describe('createExemplarsOverlayProvider', () => {
  const provider = createExemplarsOverlayProvider({
    isEnabled: () => true,
    getActiveSolution: () => 'oblt',
    onExemplarClick: jest.fn(),
  });

  describe('isApplicable', () => {
    it.each([
      ['the Metrics grid', METRICS_GRID_CONTEXT],
      ['the Discover histogram', DISCOVER_HISTOGRAM_CONTEXT],
      ['a dashboard', DASHBOARD_CONTEXT],
    ])('applies to TS STATS layers rendered by %s', (_, executionContext) => {
      const context = getContext(executionContext);
      expect(provider.isApplicable(context, context.layers[0])).toBe(true);
    });

    it.each([
      ['an unknown surface', { type: 'lens', name: 'lnsXY' }],
      ['another Discover component', { type: 'discover', name: 'other' }],
      ['no execution context', undefined],
    ])('does not apply to %s', (_, executionContext) => {
      const context = getContext(executionContext);
      expect(provider.isApplicable(context, context.layers[0])).toBe(false);
    });

    it('does not apply to a form-based layer', () => {
      const context: LensXYOverlayMatchContext = {
        layers: [{ layerId: 'layer1' }],
        executionContext: DASHBOARD_CONTEXT,
      };
      expect(provider.isApplicable(context, context.layers[0])).toBe(false);
    });

    it('follows the latest feature flag value on each evaluation', () => {
      let isEnabled = false;
      const flaggedProvider = createExemplarsOverlayProvider({
        isEnabled: () => isEnabled,
        getActiveSolution: () => 'oblt',
        onExemplarClick: jest.fn(),
      });
      const context = getContext(METRICS_GRID_CONTEXT);

      expect(flaggedProvider.isApplicable(context, context.layers[0])).toBe(false);
      isEnabled = true;
      expect(flaggedProvider.isApplicable(context, context.layers[0])).toBe(true);
    });

    it.each([
      ['a Security space or project', 'security'],
      ['a Search space or project', 'es'],
      ['a classic space', null],
    ] as const)('does not apply in %s', (_, solution) => {
      const solutionProvider = createExemplarsOverlayProvider({
        isEnabled: () => true,
        getActiveSolution: () => solution,
        onExemplarClick: jest.fn(),
      });
      const context = getContext(METRICS_GRID_CONTEXT);

      expect(solutionProvider.isApplicable(context, context.layers[0])).toBe(false);
    });
  });

  it('fetches exemplars, draws valid rows and opens the clicked exemplar', async () => {
    const onExemplarClick = jest.fn();
    const clickableProvider = createExemplarsOverlayProvider({
      isEnabled: () => true,
      getActiveSolution: () => 'oblt',
      onExemplarClick,
    });
    const executeEsql = jest.fn().mockResolvedValue(table);

    const overlay = await clickableProvider.fetchOverlay({
      layer: { layerId: 'layer1', esql: TS_QUERY },
      abortSignal: new AbortController().signal,
      executeEsql,
    });

    expect(executeEsql).toHaveBeenCalledWith(
      getExemplarsQuery(TS_QUERY),
      expect.objectContaining({ title: 'Exemplars' })
    );
    expect(overlay).toEqual({
      type: 'points',
      title: 'Exemplars',
      points: [{ id: 'exemplar-0', x: Date.parse('2026-11-06T11:24:00.890Z'), y: 0.003 }],
    });

    clickableProvider.onPointClick?.({
      providerId: clickableProvider.id,
      layerId: 'layer1',
      pointId: 'exemplar-0',
    });

    expect(onExemplarClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'exemplar-0',
        value: 0.003,
        fields: expect.objectContaining({ trace_id: 'abc' }),
      })
    );
  });
});
