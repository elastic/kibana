/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { LensExtensionMatchContext } from '@kbn/lens-common';
import {
  createExemplarsExtension,
  EXEMPLARS_APP_ID,
  getExemplarsQuery,
} from './exemplars_extension';

const LOGS_QUERY =
  'FROM kibana_sample_data_logs | STATS value = AVG(bytes) BY bucket = BUCKET(@timestamp, 50)';
const TS_QUERY =
  'TS metrics-* | STATS value = AVG(http.server.request.duration) BY TBUCKET(5 minutes)';

const getContext = (
  esql: string,
  executionContext: LensExtensionMatchContext['executionContext']
): LensExtensionMatchContext => ({
  visualizationType: 'lnsXY',
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
  name: 'unified_histogram',
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

describe('exemplars extension', () => {
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
          'EVAL value = bytes',
        ].join('\n| '),
        simulated: true,
      });
    });

    it('returns undefined without an aggregated field', () => {
      expect(getExemplarsQuery('FROM logs | STATS COUNT(*)')).toBeUndefined();
    });
  });

  describe('rules', () => {
    const extension = createExemplarsExtension({
      onExemplarClick: jest.fn(),
      isEnabled: () => true,
    });

    it('applies to STATS layers rendered by the example app', () => {
      const context = getContext(LOGS_QUERY, EXAMPLE_APP_CONTEXT);
      expect(extension.isApplicable(context, context.layers[0])).toBe(true);
    });

    it('applies to STATS layers rendered by a dashboard', () => {
      const context = getContext(LOGS_QUERY, DASHBOARD_CONTEXT);
      expect(extension.isApplicable(context, context.layers[0])).toBe(true);
    });

    it('applies to STATS layers rendered by the Discover histogram', () => {
      const context = getContext(LOGS_QUERY, DISCOVER_CONTEXT);
      expect(extension.isApplicable(context, context.layers[0])).toBe(true);
    });

    it('does not apply on other surfaces', () => {
      const context = getContext(LOGS_QUERY, { type: 'visualize', child: LENS_CHILD_CONTEXT });
      expect(extension.isApplicable(context, context.layers[0])).toBe(false);
    });

    it('does not apply when the surface only sets a name', () => {
      const context = getContext(LOGS_QUERY, { type: 'application', name: EXEMPLARS_APP_ID });
      expect(extension.isApplicable(context, context.layers[0])).toBe(false);
    });

    it('follows the latest feature flag value on each evaluation', () => {
      let isEnabled = false;
      const flaggedExtension = createExemplarsExtension({
        onExemplarClick: jest.fn(),
        isEnabled: () => isEnabled,
      });
      const context = getContext(LOGS_QUERY, EXAMPLE_APP_CONTEXT);

      expect(flaggedExtension.isApplicable(context, context.layers[0])).toBe(false);

      isEnabled = true;
      expect(flaggedExtension.isApplicable(context, context.layers[0])).toBe(true);
    });
  });

  it('draws valid rows and opens the clicked exemplar', async () => {
    const onExemplarClick = jest.fn();
    const extension = createExemplarsExtension({ onExemplarClick, isEnabled: () => true });

    const overlay = await extension.fetchOverlay({
      layer: { layerId: 'layer1', esql: LOGS_QUERY },
      abortSignal: new AbortController().signal,
      executeEsql: jest.fn().mockResolvedValue(table),
    });

    expect(overlay).toEqual({
      type: 'points',
      title: 'Simulated exemplars',
      points: [{ id: 'exemplar-0', x: Date.parse('2026-11-10T10:00:00.000Z'), y: 1200 }],
    });

    extension.onPointClick?.({
      extensionId: extension.id,
      layerId: 'layer1',
      pointId: 'exemplar-0',
    });

    expect(onExemplarClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'exemplar-0', value: 1200, simulated: true })
    );
  });
});
