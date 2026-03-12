/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { createFormWrapper, createMockServices } from '../../test_utils';
import { usePreviewChart } from './use_preview_chart';

jest.mock('@kbn/lens-embeddable-utils/config_builder');
jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: <T>(value: T) => value,
}));

const mockLensAttributes = {
  visualizationType: 'lnsXY',
  title: 'Rule results preview',
  state: {
    datasourceStates: { textBased: { layers: {} } },
    filters: [],
    query: { esql: 'FROM logs-*' },
    visualization: { layers: [] },
  },
  references: [],
};

const mockBuild = jest.fn().mockResolvedValue(mockLensAttributes);

(LensConfigBuilder as jest.Mock).mockImplementation(() => ({
  build: mockBuild,
}));

const defaultFormValues = {
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '5m' },
  evaluation: {
    query: {
      base: 'FROM logs-*',
    },
  },
};

const defaultParams = {
  query: 'FROM logs-*',
  timeField: '@timestamp',
  lookback: '5m',
};

// Fixed "now" so time-dependent assertions are deterministic
const MOCK_NOW = new Date('2026-03-11T12:00:00.000Z').getTime();

describe('usePreviewChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW);
    mockBuild.mockResolvedValue(mockLensAttributes);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds Lens attributes when all inputs are valid', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeDefined();
    expect(result.current.hasError).toBe(false);
    expect(mockBuild).toHaveBeenCalledTimes(1);
  });

  it('returns undefined attributes when query is empty', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, query: '' }), {
      wrapper,
    });

    // Wait a tick for effects to settle
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(result.current.chartQuery).toBeNull();
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('returns undefined attributes when query is only whitespace', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, query: '   ' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(result.current.chartQuery).toBeNull();
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('returns undefined attributes when timeField is empty', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, timeField: '' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(result.current.chartQuery).toBeNull();
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('returns undefined attributes when lookback is empty', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, lookback: '' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(result.current.chartQuery).toBeNull();
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('does not build when enabled is false', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, enabled: false }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(result.current.chartQuery).toBeNull();
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('sets hasError when the LensConfigBuilder fails', async () => {
    mockBuild.mockRejectedValue(new Error('Build failed'));

    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.lensAttributes).toBeUndefined();
  });

  describe('chart query construction', () => {
    it('builds chart query with WHERE time filter and BUCKET auto-bucketing', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

      await waitFor(() => {
        expect(result.current.chartQuery).not.toBeNull();
      });

      expect(result.current.chartQuery).toContain('FROM logs-*');
      // Should include a WHERE clause constraining the time field to the lookback window
      expect(result.current.chartQuery).toContain('WHERE @timestamp >=');
      expect(result.current.chartQuery).toContain('AND @timestamp <=');
      expect(result.current.chartQuery).toContain('2026-03-11T11:55:00.000Z'); // now - 5m
      expect(result.current.chartQuery).toContain('2026-03-11T12:00:00.000Z'); // now
      expect(result.current.chartQuery).toContain('STATS __count = COUNT(*)');
      // Uses BUCKET with target count + time bounds for auto-interval calculation
      expect(result.current.chartQuery).toContain(
        'BUCKET(@timestamp, 20, "2026-03-11T11:55:00.000Z", "2026-03-11T12:00:00.000Z")'
      );
      expect(result.current.chartQuery).toContain('SORT __bucket');
    });

    it('adjusts the BUCKET time bounds when lookback changes', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      const { result } = renderHook(() => usePreviewChart({ ...defaultParams, lookback: '1h' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.chartQuery).not.toBeNull();
      });

      // 1 hour lookback: now - 1h = 11:00:00
      expect(result.current.chartQuery).toContain(
        'BUCKET(@timestamp, 20, "2026-03-11T11:00:00.000Z", "2026-03-11T12:00:00.000Z")'
      );
    });

    it('returns null chart query for invalid lookback string', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      const { result } = renderHook(
        () => usePreviewChart({ ...defaultParams, lookback: 'invalid' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chartQuery).toBeNull();
      expect(mockBuild).not.toHaveBeenCalled();
    });

    it('returns null chart query for syntactically invalid ES|QL', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      const { result } = renderHook(
        () => usePreviewChart({ ...defaultParams, query: 'NOT VALID ESQL |||' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chartQuery).toBeNull();
      expect(mockBuild).not.toHaveBeenCalled();
    });
  });

  describe('time range', () => {
    it('computes a time range from a valid lookback window', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      const { result } = renderHook(() => usePreviewChart({ ...defaultParams, lookback: '1h' }), {
        wrapper,
      });

      expect(result.current.timeRange).toBeDefined();
      expect(result.current.timeRange?.from).toBeDefined();
      expect(result.current.timeRange?.to).toBeDefined();

      // The time range should span roughly 1 hour
      const fromDate = new Date(result.current.timeRange!.from).getTime();
      const toDate = new Date(result.current.timeRange!.to).getTime();
      const diffMs = toDate - fromDate;
      expect(diffMs).toBeGreaterThanOrEqual(59 * 60 * 1000);
      expect(diffMs).toBeLessThanOrEqual(61 * 60 * 1000);
    });

    it('returns undefined timeRange when lookback is empty', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      const { result } = renderHook(() => usePreviewChart({ ...defaultParams, lookback: '' }), {
        wrapper,
      });

      expect(result.current.timeRange).toBeUndefined();
    });

    it('returns undefined timeRange when lookback is invalid', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      const { result } = renderHook(
        () => usePreviewChart({ ...defaultParams, lookback: 'invalid' }),
        { wrapper }
      );

      expect(result.current.timeRange).toBeUndefined();
    });
  });

  describe('Lens config builder integration', () => {
    it('passes the chart query to LensConfigBuilder', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      renderHook(() => usePreviewChart(defaultParams), { wrapper });

      await waitFor(() => {
        expect(mockBuild).toHaveBeenCalled();
      });

      const [lensConfig, buildOptions] = mockBuild.mock.calls[0];
      expect(lensConfig.chartType).toBe('xy');
      expect(lensConfig.dataset.esql).toContain('FROM logs-*');
      expect(lensConfig.dataset.esql).toContain('STATS __count = COUNT(*)');
      expect(buildOptions.query.esql).toContain('FROM logs-*');
    });

    it('configures the Lens chart with bar series, no legend, and hidden axis titles', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      renderHook(() => usePreviewChart(defaultParams), { wrapper });

      await waitFor(() => {
        expect(mockBuild).toHaveBeenCalled();
      });

      const [lensConfig] = mockBuild.mock.calls[0];
      expect(lensConfig.legend.show).toBe(false);
      expect(lensConfig.axisTitleVisibility).toEqual({
        showXAxisTitle: false,
        showYAxisTitle: false,
        showYRightAxisTitle: false,
      });
      expect(lensConfig.layers).toHaveLength(1);
      expect(lensConfig.layers[0].seriesType).toBe('bar');
      expect(lensConfig.layers[0].xAxis.field).toBe('__bucket');
      expect(lensConfig.layers[0].yAxis[0].value).toBe('__count');
    });

    it('instantiates LensConfigBuilder with the dataViews service', async () => {
      const services = createMockServices();
      const wrapper = createFormWrapper(defaultFormValues, services);

      renderHook(() => usePreviewChart(defaultParams), { wrapper });

      await waitFor(() => {
        expect(LensConfigBuilder).toHaveBeenCalledWith(services.dataViews);
      });
    });
  });
});
