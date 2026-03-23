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
import { ALERTING_EPISODES_PAGINATED_QUERY } from '../constants';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';

jest.mock('@kbn/discover-utils');

const getEsqlDataViewMock = getEsqlDataView as jest.MockedFunction<typeof getEsqlDataView>;

describe('useAlertingEpisodesDataView', () => {
  const http = httpServiceMock.createSetupContract();
  const { dataViews } = dataPluginMock.createStartContract();

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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getEsqlDataViewMock.mockResolvedValue(mockDataView as any);
  });

  it('should call getEsqlDataView with correct parameters using default query', async () => {
    const services = { dataViews, http };

    renderHook(() => useAlertingEpisodesDataView({ services }));

    await waitFor(() => {
      expect(getEsqlDataViewMock).toHaveBeenCalledTimes(1);
    });

    expect(getEsqlDataViewMock).toHaveBeenCalledWith(
      { esql: ALERTING_EPISODES_PAGINATED_QUERY },
      undefined,
      services
    );
  });

  it('should call getEsqlDataView with custom query when provided', async () => {
    const customQuery = 'FROM .custom-index | LIMIT 100';
    const services = { dataViews, http };

    renderHook(() => useAlertingEpisodesDataView({ query: customQuery, services }));

    await waitFor(() => {
      expect(getEsqlDataViewMock).toHaveBeenCalledTimes(1);
    });

    expect(getEsqlDataViewMock).toHaveBeenCalledWith({ esql: customQuery }, undefined, services);
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
          inputFormat: 'seconds',
          outputFormat: 'humanizePrecise',
          outputPrecision: 2,
          useShortSuffix: true,
        },
      },
    });
    expect(mockDataView.addRuntimeField).toHaveBeenCalledTimes(1);
  });

  it('should return undefined when data view is not loaded yet', () => {
    getEsqlDataViewMock.mockReturnValue(new Promise(() => {}));
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
