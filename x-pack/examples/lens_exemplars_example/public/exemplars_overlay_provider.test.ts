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
  EXEMPLARS_APP_ID,
  getExemplarsQuery,
} from './exemplars_overlay_provider';

const LOGS_QUERY =
  'FROM kibana_sample_data_logs | STATS value = AVG(bytes) BY bucket = BUCKET(@timestamp, 50)';
const TS_QUERY =
  'TS metrics-* | STATS value = AVG(http.server.request.duration) BY TBUCKET(5 minutes)';

const getContext = (
  esql: string,
  executionContext: LensXYOverlayMatchContext['executionContext']
): LensXYOverlayMatchContext => ({
  layers: [{ layerId: 'layer1', esql }],
  executionContext,
});

const LENS_CHILD_CONTEXT = { type: 'lens', name: 'lnsXY' };
const EXAMPLE_APP_CONTEXT = { type: EXEMPLARS_APP_ID, child: LENS_CHILD_CONTEXT };
const DASHBOARD_CONTEXT = {
  type: 'dashboard',
  description: 'My dashboard',
  child: LENS_CHILD_CONTEXT,
};
const DISCOVER_CONTEXT = {
  type: 'discover',
  description: 'fetch chart data and total hits',
  child: LENS_CHILD_CONTEXT,
};

const table: Datatable = {
  type: 'datatable',
  columns: [],
  rows: [
    { '@timestamp': '2026-11-10T10:00:00.000Z', value: 1200, request: '/a' },
    { '@timestamp': 'not a date', value: 10 },
  ],
};

describe('exemplars overlay provider', () => {
  describe('getExemplarsQuery', () => {
    it('uses SET exemplars on TS queries', () => {
      expect(getExemplarsQuery(TS_QUERY)).toEqual({
        esql: `SET exemplars={"limit": 200};\n${TS_QUERY}`,
        simulated: false,
      });
    });

    it('simulates exemplars with the largest samples of the aggregated field', () => {
      expect(getExemplarsQuery(LOGS_QUERY)).toEqual({
        esql: [
          'FROM kibana_sample_data_logs',
          'WHERE bytes IS NOT NULL',
          'SORT bytes DESC',
          'LIMIT 30',
          'EVAL value = bytes, simulated_exemplar = true',
        ].join('\n| '),
        simulated: true,
      });
    });

    it('keeps the commands that filter the rows before the aggregation', () => {
      const query = getExemplarsQuery(
        'FROM logs | WHERE service.name == "api" | EVAL kb = bytes / 1024 | STATS value = AVG(kb) BY bucket = BUCKET(@timestamp, 50)'
      );
      expect(query?.esql).toBe(
        [
          'FROM logs | WHERE service.name == "api" | EVAL kb = bytes / 1024',
          'WHERE kb IS NOT NULL',
          'SORT kb DESC',
          'LIMIT 30',
          'EVAL value = kb, simulated_exemplar = true',
        ].join('\n| ')
      );
    });

    it('does not simulate when STATS is only nested in FORK', () => {
      expect(
        getExemplarsQuery(
          'FROM logs | FORK (STATS value = AVG(bytes) BY bucket = BUCKET(@timestamp, 50)) (LIMIT 10) | SORT bucket'
        )
      ).toBeUndefined();
    });

    it('does not simulate when a command before STATS can drop the timestamp', () => {
      expect(
        getExemplarsQuery(
          'FROM logs | RENAME @timestamp AS ts | STATS value = AVG(bytes) BY bucket = BUCKET(ts, 50)'
        )
      ).toBeUndefined();
    });

    it('returns undefined without an aggregated field', () => {
      expect(getExemplarsQuery('FROM logs | STATS COUNT(*)')).toBeUndefined();
    });
  });

  describe('rules', () => {
    const provider = createExemplarsOverlayProvider({
      onExemplarClick: jest.fn(),
      isEnabled: () => true,
    });

    it('applies to STATS layers rendered by the example app', () => {
      const context = getContext(LOGS_QUERY, EXAMPLE_APP_CONTEXT);
      expect(provider.isApplicable(context, context.layers[0])).toBe(true);
    });

    it('applies to STATS layers rendered by a dashboard', () => {
      const context = getContext(LOGS_QUERY, DASHBOARD_CONTEXT);
      expect(provider.isApplicable(context, context.layers[0])).toBe(true);
    });

    it('applies to STATS layers rendered by the Discover histogram', () => {
      const context = getContext(LOGS_QUERY, DISCOVER_CONTEXT);
      expect(provider.isApplicable(context, context.layers[0])).toBe(true);
    });

    it('does not apply on other surfaces', () => {
      const context = getContext(LOGS_QUERY, { type: 'visualize', child: LENS_CHILD_CONTEXT });
      expect(provider.isApplicable(context, context.layers[0])).toBe(false);
    });

    it('does not apply when the surface only sets a name', () => {
      const context = getContext(LOGS_QUERY, { type: 'application', name: EXEMPLARS_APP_ID });
      expect(provider.isApplicable(context, context.layers[0])).toBe(false);
    });

    it('follows the latest feature flag value on each evaluation', () => {
      let isEnabled = false;
      const flaggedProvider = createExemplarsOverlayProvider({
        onExemplarClick: jest.fn(),
        isEnabled: () => isEnabled,
      });
      const context = getContext(LOGS_QUERY, EXAMPLE_APP_CONTEXT);

      expect(flaggedProvider.isApplicable(context, context.layers[0])).toBe(false);

      isEnabled = true;
      expect(flaggedProvider.isApplicable(context, context.layers[0])).toBe(true);
    });
  });

  const fetchContext = (executeEsql: jest.Mock) => ({
    layer: { layerId: 'layer1', esql: LOGS_QUERY },
    filters: [],
    queries: [],
    abortSignal: new AbortController().signal,
    executeEsql,
  });

  it('draws the valid rows as returned by the query', async () => {
    const provider = createExemplarsOverlayProvider({
      onExemplarClick: jest.fn(),
      isEnabled: () => true,
    });

    const overlay = await provider.fetchOverlay(fetchContext(jest.fn().mockResolvedValue(table)));

    expect(overlay).toEqual({
      type: 'points',
      title: 'Simulated exemplars',
      data: [table.rows[0]],
      xAccessor: expect.any(Function),
      yAccessor: 'value',
    });
    expect(overlay?.data[0]).toBe(table.rows[0]);
    const { xAccessor } = overlay ?? {};
    expect(typeof xAccessor === 'function' && xAccessor(table.rows[0])).toBe(
      Date.parse('2026-11-10T10:00:00.000Z')
    );
  });

  it('opens the clicked row without the simulated flag column', () => {
    const onExemplarClick = jest.fn();
    const provider = createExemplarsOverlayProvider({ onExemplarClick, isEnabled: () => true });

    provider.onPointClick?.({
      providerId: provider.id,
      layerId: 'layer1',
      datum: { value: 1200, request: '/a', simulated_exemplar: true },
    });

    expect(onExemplarClick).toHaveBeenCalledWith({
      simulated: true,
      fields: { value: 1200, request: '/a' },
    });
  });

  it('treats rows without the simulated flag as real exemplars', () => {
    const onExemplarClick = jest.fn();
    const provider = createExemplarsOverlayProvider({ onExemplarClick, isEnabled: () => true });

    provider.onPointClick?.({ providerId: provider.id, layerId: 'layer1', datum: { value: 42 } });

    expect(onExemplarClick).toHaveBeenCalledWith({ simulated: false, fields: { value: 42 } });
  });
});
