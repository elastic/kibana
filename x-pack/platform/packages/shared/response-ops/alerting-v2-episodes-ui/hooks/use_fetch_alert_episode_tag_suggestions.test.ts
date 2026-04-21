/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import {
  type AlertActionTagSuggestionRow,
  fetchAlertActionTagSuggestions,
} from '../apis/fetch_alert_action_tag_suggestions';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchAlertEpisodeTagSuggestions } from './use_fetch_alert_episode_tag_suggestions';

jest.mock('../apis/fetch_alert_action_tag_suggestions');

const fetchAlertActionTagSuggestionsMock = jest.mocked(fetchAlertActionTagSuggestions);
const mockExpressions = {} as ExpressionsStart;

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchAlertEpisodeTagSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not fetch when enabled is false', () => {
    renderHook(
      () =>
        useFetchAlertEpisodeTagSuggestions({
          enabled: false,
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );
    expect(fetchAlertActionTagSuggestionsMock).not.toHaveBeenCalled();
  });

  it('fetches and maps rows to non-empty tag strings', async () => {
    const rows: AlertActionTagSuggestionRow[] = [{ tags: 'alpha' }, { tags: 'beta' }];
    fetchAlertActionTagSuggestionsMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () =>
        useFetchAlertEpisodeTagSuggestions({
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(['alpha', 'beta']);
  });

  it('omits empty tag strings in the select mapping', async () => {
    const rows: AlertActionTagSuggestionRow[] = [{ tags: 'keep' }, { tags: '' }];
    fetchAlertActionTagSuggestionsMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () =>
        useFetchAlertEpisodeTagSuggestions({
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(['keep']);
  });

  it('returns an empty array when the fetch returns no rows', async () => {
    fetchAlertActionTagSuggestionsMock.mockResolvedValue([]);

    const { result } = renderHook(
      () =>
        useFetchAlertEpisodeTagSuggestions({
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });
});
