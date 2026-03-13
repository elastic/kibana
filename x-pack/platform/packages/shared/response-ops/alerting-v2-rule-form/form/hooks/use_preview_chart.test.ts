/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { createFormWrapper, createMockServices } from '../../test_utils';
import { usePreviewChart } from './use_preview_chart';

const mockUpdate = jest.fn();
const mockLensVisServiceInstance = {
  update: mockUpdate,
  state$: { next: jest.fn(), getValue: jest.fn() },
};

jest.mock('@kbn/unified-histogram', () => ({
  LensVisService: jest.fn().mockImplementation(() => mockLensVisServiceInstance),
}));

const mockGetESQLAdHocDataview = jest.fn();
jest.mock('@kbn/esql-utils', () => ({
  getESQLAdHocDataview: (...args: unknown[]) => mockGetESQLAdHocDataview(...args),
}));

jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: <T>(value: T) => value,
}));

const mockLensAttributes = {
  visualizationType: 'lnsXY',
  title: '',
  state: {
    datasourceStates: { textBased: { layers: {} } },
    filters: [],
    query: { esql: 'FROM logs-*' },
    visualization: { layers: [] },
  },
  references: [],
};

const mockDataView = {
  id: 'test-id',
  timeFieldName: '@timestamp',
  getIndexPattern: () => 'logs-*',
  toSpec: () => ({ id: 'test-id', title: 'logs-*' }),
};

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

    mockGetESQLAdHocDataview.mockResolvedValue(mockDataView);
    mockUpdate.mockReturnValue({
      status: 'completed',
      currentSuggestionContext: { suggestion: {}, type: 'histogramForESQL' },
      visContext: {
        attributes: mockLensAttributes,
        requestData: {},
        suggestionType: 'histogramForESQL',
      },
    });
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
  });

  it('creates an ad-hoc DataView from the query', async () => {
    const services = createMockServices();
    const wrapper = createFormWrapper(defaultFormValues, services);

    renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(mockGetESQLAdHocDataview).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViewsService: services.dataViews,
          query: 'FROM logs-*',
        })
      );
    });
  });

  it('calls LensVisService.update with the correct query params', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.queryParams.query).toEqual({ esql: 'FROM logs-*' });
    expect(updateArgs.queryParams.isPlainRecord).toBe(true);
    expect(updateArgs.queryParams.filters).toEqual([]);
    expect(updateArgs.queryParams.dataView).toBe(mockDataView);
    expect(updateArgs.externalVisContext).toBeUndefined();
    expect(updateArgs.breakdownField).toBeUndefined();
  });

  it('passes esqlColumns to LensVisService as DatatableColumns', async () => {
    const wrapper = createFormWrapper(defaultFormValues);
    const esqlColumns = [
      { id: 'host.name', displayAsText: 'host.name', esType: 'keyword' },
      { id: 'count', displayAsText: 'count', esType: 'long' },
    ];

    renderHook(() => usePreviewChart({ ...defaultParams, esqlColumns }), { wrapper });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    const updateArgs = mockUpdate.mock.calls[0][0];
    // ES types are mapped to Kibana DatatableColumnType:
    // 'keyword' → 'string', 'long' → 'number'
    expect(updateArgs.queryParams.columns).toEqual([
      { id: 'host.name', name: 'host.name', meta: { type: 'string', esType: 'keyword' } },
      { id: 'count', name: 'count', meta: { type: 'number', esType: 'long' } },
    ]);
  });

  it('returns undefined attributes when query is empty', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, query: '' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(mockUpdate).not.toHaveBeenCalled();
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
    expect(mockUpdate).not.toHaveBeenCalled();
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
    expect(mockUpdate).not.toHaveBeenCalled();
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
    expect(mockUpdate).not.toHaveBeenCalled();
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
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('sets hasError when LensVisService initialization fails', async () => {
    mockGetESQLAdHocDataview.mockRejectedValue(new Error('DataView creation failed'));

    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.lensAttributes).toBeUndefined();
  });

  it('handles LensVisService returning no suggestion gracefully', async () => {
    mockUpdate.mockReturnValue({
      status: 'completed',
      currentSuggestionContext: { suggestion: undefined, type: 'unsupported' },
      visContext: undefined,
    });

    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(result.current.hasError).toBe(false);
  });

  it('returns undefined attributes for syntactically invalid ES|QL', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(
      () => usePreviewChart({ ...defaultParams, query: 'NOT VALID ESQL |||' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(mockUpdate).not.toHaveBeenCalled();
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
});
