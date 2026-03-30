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
import { useFetchGroupActions } from './use_fetch_group_actions';

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

describe('useFetchGroupActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not call ES|QL when groupHashes is empty', () => {
    renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: [],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );
    expect(executeEsqlQueryMock).not.toHaveBeenCalled();
  });

  it('fetches and builds groupActionsMap keyed by group_hash', async () => {
    executeEsqlQueryMock.mockResolvedValue({
      rows: [
        {
          group_hash: 'gh-1',
          rule_id: 'rule-1',
          last_deactivate_action: 'deactivate',
          last_snooze_action: 'snooze',
          snooze_expiry: '2035-01-02T12:00:00.000Z',
          tags: ['t1', 't2'],
        },
      ],
    } as unknown as Awaited<ReturnType<typeof executeEsqlQuery>>);

    const { result } = renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['gh-1'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(executeEsqlQueryMock).toHaveBeenCalledTimes(1);
    const call = executeEsqlQueryMock.mock.calls[0][0];
    expect(call.query).toContain('gh-1');
    expect(call.query).toContain('group_hash');
    expect(call.query).not.toContain('"ack"');

    const action = result.current.groupActionsMap.get('gh-1');
    expect(action).toEqual({
      groupHash: 'gh-1',
      ruleId: 'rule-1',
      lastDeactivateAction: 'deactivate',
      lastSnoozeAction: 'snooze',
      snoozeExpiry: '2035-01-02T12:00:00.000Z',
      tags: ['t1', 't2'],
    });
  });

  it('normalizes string tags into a single-element array', async () => {
    executeEsqlQueryMock.mockResolvedValue({
      rows: [
        {
          group_hash: 'gh-2',
          rule_id: null,
          last_deactivate_action: null,
          last_snooze_action: null,
          snooze_expiry: null,
          tags: 'solo',
        },
      ],
    } as unknown as Awaited<ReturnType<typeof executeEsqlQuery>>);

    const { result } = renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['gh-2'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.groupActionsMap.has('gh-2')).toBe(true));
    expect(result.current.groupActionsMap.get('gh-2')?.tags).toEqual(['solo']);
  });

  it('converts tags to empty array when row tags are null', async () => {
    executeEsqlQueryMock.mockResolvedValue({
      rows: [
        {
          group_hash: 'gh-3',
          rule_id: null,
          last_deactivate_action: null,
          last_snooze_action: null,
          snooze_expiry: null,
          tags: null,
        },
      ],
    } as unknown as Awaited<ReturnType<typeof executeEsqlQuery>>);

    const { result } = renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['gh-3'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.groupActionsMap.has('gh-3')).toBe(true));
    expect(result.current.groupActionsMap.get('gh-3')?.tags).toEqual([]);
  });

  it('escapes quotes in group hashes in the generated query', async () => {
    executeEsqlQueryMock.mockResolvedValue({
      rows: [],
    } as unknown as Awaited<ReturnType<typeof executeEsqlQuery>>);

    renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['say"cheese'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(executeEsqlQueryMock).toHaveBeenCalled());
    const query = executeEsqlQueryMock.mock.calls[0][0].query;
    expect(query).toContain('\\"');
  });

  it('keeps the last row when duplicate group hashes are returned', async () => {
    executeEsqlQueryMock.mockResolvedValue({
      rows: [
        {
          group_hash: 'dup',
          rule_id: 'r1',
          last_deactivate_action: null,
          last_snooze_action: 'snooze',
          snooze_expiry: null,
          tags: [],
        },
        {
          group_hash: 'dup',
          rule_id: 'r2',
          last_deactivate_action: 'deactivate',
          last_snooze_action: null,
          snooze_expiry: null,
          tags: [],
        },
      ],
    } as unknown as Awaited<ReturnType<typeof executeEsqlQuery>>);

    const { result } = renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['dup'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.groupActionsMap.get('dup')?.ruleId).toBe('r2'));
  });
});
