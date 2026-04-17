/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getEsqlDataView } from '@kbn/discover-utils';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import type { DataView } from '@kbn/data-views-plugin/common';

jest.mock('@kbn/discover-utils');

const mockGetEsqlDataView = jest.mocked(getEsqlDataView);

const http = httpServiceMock.createSetupContract();
const { dataViews } = dataPluginMock.createStartContract();

const mockDefaultQuery = 'FROM .rule-events | WHERE type == "alert"';

jest.mock('../queries/episodes_query', () => ({
  buildEpisodesBaseQuery: jest.fn().mockReturnValue({
    print: jest.fn().mockReturnValue('FROM .rule-events | WHERE type == "alert"'),
  }),
}));

const mockDataView = {
  fields: [
    { name: 'rule.id' },
    { name: 'episode.status' },
    { name: '@timestamp' },
    { name: 'other.field' },
  ],
  setFieldCustomLabel: jest.fn(),
  setFieldFormat: jest.fn(),
  addRuntimeField: jest.fn(),
} as unknown as DataView;

mockGetEsqlDataView.mockResolvedValue(mockDataView);

describe('useAlertingEpisodesDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call getEsqlDataView with correct parameters using default query', async () => {
    const services = { dataViews, http };

    renderHook(() => useAlertingEpisodesDataView({ services }));

    await waitFor(() => {
      expect(mockGetEsqlDataView).toHaveBeenCalledTimes(1);
    });

    expect(mockGetEsqlDataView).toHaveBeenCalledWith(
      { esql: mockDefaultQuery },
      undefined,
      services
    );
  });

  it('should call getEsqlDataView with custom query when provided', async () => {
    const customQuery = 'FROM .custom-index | LIMIT 100';
    const services = { dataViews, http };

    renderHook(() => useAlertingEpisodesDataView({ query: customQuery, services }));

    await waitFor(() => {
      expect(mockGetEsqlDataView).toHaveBeenCalledTimes(1);
    });

    expect(mockGetEsqlDataView).toHaveBeenCalledWith({ esql: customQuery }, undefined, services);
  });

  it('should set custom labels for known fields', async () => {
    const services = { dataViews, http };

    renderHook(() => useAlertingEpisodesDataView({ services }));

    await waitFor(() => {
      expect(mockDataView.setFieldCustomLabel).toHaveBeenCalled();
    });

    expect(mockDataView.setFieldCustomLabel).toHaveBeenCalledWith('rule.id', 'Rule');
    expect(mockDataView.setFieldCustomLabel).toHaveBeenCalledWith('episode.status', 'Status');
    expect(mockDataView.setFieldCustomLabel).toHaveBeenCalledTimes(2);
  });

  it('should add runtime field for duration', async () => {
    const services = { dataViews, http };

    renderHook(() => useAlertingEpisodesDataView({ services }));

    await waitFor(() => {
      expect(mockDataView.addRuntimeField).toHaveBeenCalled();
    });

    expect(mockDataView.addRuntimeField).toHaveBeenCalledWith('duration', {
      type: 'long',
      customLabel: 'Duration',
      format: {
        id: 'duration',
        params: {
          includeSpaceWithSuffix: true,
          inputFormat: 'milliseconds',
          outputFormat: 'humanizePrecise',
          outputPrecision: 0,
          useShortSuffix: true,
        },
      },
    });
    expect(mockDataView.addRuntimeField).toHaveBeenCalledTimes(1);
  });

  it('should return undefined when data view is not loaded yet', () => {
    mockGetEsqlDataView.mockReturnValueOnce(new Promise(() => {}));
    const services = { dataViews, http };

    const { result } = renderHook(() => useAlertingEpisodesDataView({ services }));

    expect(result.current).toBeUndefined();
  });

  it('should return data view once loaded', async () => {
    const services = { dataViews, http };

    const { result } = renderHook(() => useAlertingEpisodesDataView({ services }));

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(result.current).toBe(mockDataView);
  });
});
