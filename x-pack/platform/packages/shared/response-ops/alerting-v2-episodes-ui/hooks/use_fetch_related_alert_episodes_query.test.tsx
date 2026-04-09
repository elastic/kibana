/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { fetchRelatedAlertEpisodes } from '../apis/fetch_related_alert_episodes';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchRelatedAlertEpisodesQuery } from './use_fetch_related_alert_episodes_query';

jest.mock('../apis/fetch_related_alert_episodes');

const fetchRelatedAlertEpisodesMock = jest.mocked(fetchRelatedAlertEpisodes);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchRelatedAlertEpisodesQuery', () => {
  const mockExpressions = {} as ExpressionsStart;
  const http = httpServiceMock.createStartContract();
  const { dataViews } = dataPluginMock.createStartContract();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('is idle when ruleId or excludeEpisodeId is missing', () => {
    const { result } = renderHook(
      () =>
        useFetchRelatedAlertEpisodesQuery({
          ruleId: 'r1',
          excludeEpisodeId: undefined,
          pageSize: 5,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchRelatedAlertEpisodesMock).not.toHaveBeenCalled();
  });

  it('fetches related episodes when rule and exclude id are set', async () => {
    fetchRelatedAlertEpisodesMock.mockResolvedValue([]);

    const ruleId = 'rule-1';
    const excludeEpisodeId = 'ep-current';
    const pageSize = 5;

    const { result } = renderHook(
      () =>
        useFetchRelatedAlertEpisodesQuery({
          ruleId,
          excludeEpisodeId,
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchRelatedAlertEpisodesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize,
        ruleId,
        excludeEpisodeId,
        services: expect.objectContaining({ expressions: mockExpressions }),
      })
    );
    expect(result.current.data).toEqual([]);
  });
});
