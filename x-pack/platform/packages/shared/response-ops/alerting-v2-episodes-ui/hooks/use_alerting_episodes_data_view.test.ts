/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getEsqlDataView } from '@kbn/discover-utils';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import type { DataView } from '@kbn/data-views-plugin/common';
import { EpisodeDataSourceProvider } from '../context/episode_data_source_context';
import { createMockSpaces } from './test_utils';

jest.mock('@kbn/discover-utils');
jest.mock('@kbn/esql-utils');

const mockGetEsqlDataView = jest.mocked(getEsqlDataView);
const mockGetESQLAdHocDataview = jest.mocked(getESQLAdHocDataview);

const http = httpServiceMock.createSetupContract();
const { dataViews } = dataPluginMock.createStartContract();
const mockSpaces = createMockSpaces();

const mockDefaultQuery = 'FROM .rule-events | WHERE type == "alert"';

jest.mock('@kbn/alerting-v2-common-queries', () => ({
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

  it('should call getEsqlDataView with space-scoped episodes query', async () => {
    const services = { dataViews, http, spaces: mockSpaces };

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

  it('should set custom labels for known fields', async () => {
    const services = { dataViews, http, spaces: mockSpaces };

    renderHook(() => useAlertingEpisodesDataView({ services }));

    await waitFor(() => {
      expect(mockDataView.setFieldCustomLabel).toHaveBeenCalled();
    });

    expect(mockDataView.setFieldCustomLabel).toHaveBeenCalledWith('rule.id', 'Rule');
    expect(mockDataView.setFieldCustomLabel).toHaveBeenCalledWith('episode.status', 'Status');
    expect(mockDataView.setFieldCustomLabel).toHaveBeenCalledTimes(2);
  });

  it('should add runtime field for duration', async () => {
    const services = { dataViews, http, spaces: mockSpaces };

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
    expect(mockDataView.addRuntimeField).toHaveBeenCalledTimes(3);
  });

  it('should add a runtime field for the rule tags column, which has no backing query field', async () => {
    const services = { dataViews, http, spaces: mockSpaces };

    renderHook(() => useAlertingEpisodesDataView({ services }));

    await waitFor(() => {
      expect(mockDataView.addRuntimeField).toHaveBeenCalled();
    });

    expect(mockDataView.addRuntimeField).toHaveBeenCalledWith('rule_tags', {
      type: 'keyword',
      script: { source: "emit('')" },
      customLabel: 'Rule tags',
    });
  });

  it('should return undefined when data view is not loaded yet', () => {
    mockGetEsqlDataView.mockReturnValueOnce(new Promise(() => {}));
    const services = { dataViews, http, spaces: mockSpaces };

    const { result } = renderHook(() => useAlertingEpisodesDataView({ services }));

    expect(result.current).toBeUndefined();
  });

  it('should return data view once loaded', async () => {
    const services = { dataViews, http, spaces: mockSpaces };

    const { result } = renderHook(() => useAlertingEpisodesDataView({ services }));

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(result.current).toBe(mockDataView);
  });

  describe('when queryV2Source is false', () => {
    const fields: Array<{ name: string }> = [];
    const fallbackDataView = {
      fields: Object.assign(fields, {
        add: jest.fn((spec: { name: string }) => fields.push(spec)),
      }),
      setFieldCustomLabel: jest.fn(),
      setFieldFormat: jest.fn(),
      addRuntimeField: jest.fn(),
    } as unknown as DataView;
    const services = { dataViews, http, spaces: mockSpaces };
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(EpisodeDataSourceProvider, { queryV2Source: false }, children);

    beforeEach(() => {
      fields.length = 0;
      mockGetESQLAdHocDataview.mockResolvedValue(fallbackDataView);
    });

    it('skips field and time field fetching', async () => {
      const { result } = renderHook(() => useAlertingEpisodesDataView({ services }), { wrapper });

      await waitFor(() => expect(result.current).toBe(fallbackDataView));

      expect(mockGetEsqlDataView).not.toHaveBeenCalled();
      expect(mockGetESQLAdHocDataview).toHaveBeenCalledWith({
        dataViewsService: dataViews,
        query: mockDefaultQuery,
        options: { createNewInstanceEvenIfCachedOneAvailable: true, skipFetchFields: true },
      });
    });

    it('declares the mapped episode columns locally so they stay sortable and labelled', async () => {
      const { result } = renderHook(() => useAlertingEpisodesDataView({ services }), { wrapper });

      await waitFor(() => expect(result.current).toBe(fallbackDataView));

      expect(fields.map(({ name }) => name)).toEqual([
        '@timestamp',
        'episode.id',
        'episode.status',
        'rule.id',
        'group_hash',
        'severity',
      ]);
      expect(fields).toContainEqual(
        expect.objectContaining({ name: '@timestamp', type: 'date', aggregatable: true })
      );
      expect(fallbackDataView.setFieldCustomLabel).toHaveBeenCalledWith('rule.id', 'Rule');
      expect(fallbackDataView.setFieldCustomLabel).toHaveBeenCalledWith('episode.status', 'Status');
    });

    it('only declares fields returned by the episodes query', async () => {
      const { ALERT_EPISODE_FIELDS } = jest.requireActual<
        typeof import('@kbn/alerting-v2-common-queries')
      >('@kbn/alerting-v2-common-queries');

      const { result } = renderHook(() => useAlertingEpisodesDataView({ services }), { wrapper });

      await waitFor(() => expect(result.current).toBe(fallbackDataView));

      const episodeFields: readonly string[] = ALERT_EPISODE_FIELDS;
      expect(
        fields.map(({ name }) => name).filter((name) => !episodeFields.includes(name))
      ).toEqual([]);
    });
  });
});
