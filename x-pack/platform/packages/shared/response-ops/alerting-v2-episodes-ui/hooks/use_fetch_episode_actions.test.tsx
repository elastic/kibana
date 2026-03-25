/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { useFetchEpisodeActions } from './use_fetch_episode_actions';

jest.mock('../utils/execute_esql_query');

const executeEsqlQueryMock = jest.mocked(executeEsqlQuery);
const mockExpressions = {} as ExpressionsStart;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useFetchEpisodeActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not call ES|QL when episodeIds is empty', () => {
    renderHook(
      () =>
        useFetchEpisodeActions({
          episodeIds: [],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );
    expect(executeEsqlQueryMock).not.toHaveBeenCalled();
  });

  it('fetches and builds actionsMap keyed by episode id', async () => {
    executeEsqlQueryMock.mockResolvedValue({
      rows: [
        {
          episode_id: 'ep-1',
          rule_id: 'rule-1',
          group_hash: 'gh-1',
          last_ack_action: 'ack',
          last_deactivate_action: null,
          last_snooze_action: 'snooze',
          tags: ['t1', 't2'],
        },
      ],
    } as unknown as Awaited<ReturnType<typeof executeEsqlQuery>>);

    const { result } = renderHook(
      () =>
        useFetchEpisodeActions({
          episodeIds: ['ep-1'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(executeEsqlQueryMock).toHaveBeenCalledTimes(1);
    const call = executeEsqlQueryMock.mock.calls[0][0];
    expect(call.query).toContain('ep-1');
    expect(call.expressions).toBe(mockExpressions);

    const action = result.current.actionsMap.get('ep-1');
    expect(action).toEqual({
      episodeId: 'ep-1',
      ruleId: 'rule-1',
      groupHash: 'gh-1',
      lastAckAction: 'ack',
      lastDeactivateAction: null,
      lastSnoozeAction: 'snooze',
      tags: ['t1', 't2'],
    });
  });

  it('normalizes string tags into a single-element array', async () => {
    executeEsqlQueryMock.mockResolvedValue({
      rows: [
        {
          episode_id: 'ep-2',
          rule_id: null,
          group_hash: null,
          last_ack_action: null,
          last_deactivate_action: null,
          last_snooze_action: null,
          tags: 'solo',
        },
      ],
    } as unknown as Awaited<ReturnType<typeof executeEsqlQuery>>);

    const { result } = renderHook(
      () =>
        useFetchEpisodeActions({
          episodeIds: ['ep-2'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.actionsMap.has('ep-2')).toBe(true));
    expect(result.current.actionsMap.get('ep-2')?.tags).toEqual(['solo']);
  });

  it('converts tags to empty arraywhen row tags are null', async () => {
    executeEsqlQueryMock.mockResolvedValue({
      rows: [
        {
          episode_id: 'ep-3',
          rule_id: null,
          group_hash: null,
          last_ack_action: null,
          last_deactivate_action: null,
          last_snooze_action: null,
          tags: null,
        },
      ],
    } as unknown as Awaited<ReturnType<typeof executeEsqlQuery>>);

    const { result } = renderHook(
      () =>
        useFetchEpisodeActions({
          episodeIds: ['ep-3'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.actionsMap.has('ep-3')).toBe(true));
    expect(result.current.actionsMap.get('ep-3')?.tags).toEqual([]);
  });

  it('escapes quotes in episode ids in the generated query', async () => {
    executeEsqlQueryMock.mockResolvedValue({
      rows: [],
    } as unknown as Awaited<ReturnType<typeof executeEsqlQuery>>);

    renderHook(
      () =>
        useFetchEpisodeActions({
          episodeIds: ['say"cheese'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(executeEsqlQueryMock).toHaveBeenCalled());
    const query = executeEsqlQueryMock.mock.calls[0][0].query;
    expect(query).toContain('\\"');
  });

  it('keeps the last row when duplicate episode ids are returned', async () => {
    executeEsqlQueryMock.mockResolvedValue({
      rows: [
        {
          episode_id: 'dup',
          rule_id: 'r1',
          group_hash: null,
          last_ack_action: 'ack',
          last_deactivate_action: null,
          last_snooze_action: null,
          tags: [],
        },
        {
          episode_id: 'dup',
          rule_id: 'r2',
          group_hash: null,
          last_ack_action: 'unack',
          last_deactivate_action: null,
          last_snooze_action: null,
          tags: [],
        },
      ],
    } as unknown as Awaited<ReturnType<typeof executeEsqlQuery>>);

    const { result } = renderHook(
      () =>
        useFetchEpisodeActions({
          episodeIds: ['dup'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.actionsMap.get('dup')?.ruleId).toBe('r2'));
  });
});
