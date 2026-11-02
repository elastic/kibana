/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { AnalyticsMapReturnType, MapElements } from '@kbn/ml-data-frame-analytics-utils';
import { JOB_MAP_NODE_TYPES } from '@kbn/ml-data-frame-analytics-utils';
import { useMlApi } from '../../../contexts/kibana';
import { useFetchAnalyticsMapData } from './use_fetch_analytics_map_data';

jest.mock('../../../contexts/kibana');

const indexNode: MapElements = {
  data: {
    id: 'kibana_sample_data_flights-index',
    label: 'kibana_sample_data_flights',
    type: 'index',
  },
};

const analyticsNode: MapElements = {
  data: {
    id: 'reg-flights-analytics',
    label: 'reg-flights',
    type: 'analytics',
    analysisType: 'regression',
    isRoot: true,
  },
};

const edge: MapElements = {
  data: {
    id: 'kibana_sample_data_flights-index~reg-flights-analytics',
    source: 'kibana_sample_data_flights-index',
    target: 'reg-flights-analytics',
  },
};

const createMapResponse = (
  overrides: Partial<AnalyticsMapReturnType> = {}
): AnalyticsMapReturnType => ({
  elements: [indexNode, analyticsNode, edge],
  details: {
    'reg-flights-analytics': { id: 'reg-flights' },
    'kibana_sample_data_flights-index': { kibana_sample_data_flights: {} },
  },
  error: null,
  ...overrides,
});

describe('useFetchAnalyticsMapData', () => {
  const getDataFrameAnalyticsMap = jest.fn();

  beforeEach(() => {
    getDataFrameAnalyticsMap.mockReset();
    (useMlApi as jest.Mock).mockImplementation(() => ({
      dataFrameAnalytics: {
        getDataFrameAnalyticsMap,
      },
    }));
  });

  test('loads map by analytics id (non-root) and replaces elements', async () => {
    getDataFrameAnalyticsMap.mockResolvedValue(createMapResponse());

    const { result } = renderHook(() => useFetchAnalyticsMapData());

    await act(async () => {
      await result.current.fetchAndSetElementsWrapper({ analyticsId: 'reg-flights-analytics' });
    });

    expect(getDataFrameAnalyticsMap).toHaveBeenCalledWith(
      'reg-flights-analytics',
      false,
      undefined
    );
    expect(getDataFrameAnalyticsMap).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.elements).toEqual([indexNode, analyticsNode, edge]);
    expect(result.current.nodeDetails).toMatchObject({
      'reg-flights-analytics': { id: 'reg-flights' },
    });
    expect(result.current.error).toBeUndefined();
    expect(result.current.message).toBeUndefined();
  });

  test('passes trained model type when expanding by model id without treat-as-root id', async () => {
    getDataFrameAnalyticsMap.mockResolvedValue(createMapResponse());

    const { result } = renderHook(() => useFetchAnalyticsMapData());

    await act(async () => {
      await result.current.fetchAndSetElementsWrapper({
        analyticsId: 'reg-flights-analytics',
        modelId: 'reg-flights-1776271906807-trainedModel',
      });
    });

    expect(getDataFrameAnalyticsMap).toHaveBeenCalledWith(
      'reg-flights-1776271906807-trainedModel',
      false,
      JOB_MAP_NODE_TYPES.TRAINED_MODEL
    );
  });

  test('merges new map elements onto existing elements when expanding a node as root', async () => {
    const extraNode: MapElements = {
      data: {
        id: 'extra-node',
        label: 'extra',
        type: 'analytics',
      },
    };

    const expansionResponse = createMapResponse({
      elements: [extraNode],
      details: { 'extra-node': { id: 'extra' } },
    });

    getDataFrameAnalyticsMap
      .mockResolvedValueOnce(createMapResponse())
      .mockResolvedValueOnce(expansionResponse)
      .mockResolvedValue(expansionResponse);

    const { result } = renderHook(() => useFetchAnalyticsMapData());

    await act(async () => {
      await result.current.fetchAndSetElementsWrapper({ analyticsId: 'reg-flights-analytics' });
    });

    await act(async () => {
      await result.current.fetchAndSetElementsWrapper({
        id: 'reg-flights-analytics',
        type: JOB_MAP_NODE_TYPES.ANALYTICS,
      });
    });

    expect(getDataFrameAnalyticsMap).toHaveBeenCalledWith(
      'reg-flights-analytics',
      true,
      JOB_MAP_NODE_TYPES.ANALYTICS
    );

    await waitFor(() => {
      expect(result.current.elements.map((el) => el.data.id)).toEqual(
        expect.arrayContaining(['extra-node', 'reg-flights-analytics'])
      );
    });

    expect(result.current.nodeDetails).toMatchObject({
      'extra-node': { id: 'extra' },
      'reg-flights-analytics': { id: 'reg-flights' },
    });
  });

  test('sets error when fetch returns a non-null error', async () => {
    getDataFrameAnalyticsMap.mockResolvedValue({
      elements: [],
      details: {},
      error: { statusCode: 500, message: 'boom' },
    });

    const { result } = renderHook(() => useFetchAnalyticsMapData());

    await act(async () => {
      await result.current.fetchAndSetElementsWrapper({ analyticsId: 'job-1' });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual({ statusCode: 500, message: 'boom' });
  });

  test('sets empty message when no elements are returned', async () => {
    getDataFrameAnalyticsMap.mockResolvedValue({
      elements: [],
      details: {},
      error: null,
    });

    const { result } = renderHook(() => useFetchAnalyticsMapData());

    await act(async () => {
      await result.current.fetchAndSetElementsWrapper({ analyticsId: 'missing-job' });
    });

    await waitFor(() => {
      expect(result.current.message).toBe('No related analytics jobs found for missing-job.');
    });
  });
});
