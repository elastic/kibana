/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { fetchGroupActions } from '../apis/fetch_group_actions';
import type { GroupActionRow } from '../queries/group_actions_query';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchGroupActions } from './use_fetch_group_actions';

jest.mock('../apis/fetch_group_actions');

const fetchGroupActionsMock = jest.mocked(fetchGroupActions);
const mockExpressions = {} as ExpressionsStart;

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchGroupActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('does not fetch when groupHashes is empty', () => {
    renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: [],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );
    expect(fetchGroupActionsMock).not.toHaveBeenCalled();
  });

  it('fetches and builds groupActionsMap keyed by group_hash', async () => {
    const rows: GroupActionRow[] = [
      {
        group_hash: 'gh-1',
        rule_id: 'rule-1',
        last_deactivate_action: 'deactivate',
        last_snooze_action: 'snooze',
        snooze_expiry: '2035-01-02T12:00:00.000Z',
        tags: ['t1', 't2'],
      },
    ];
    fetchGroupActionsMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['gh-1'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data!.get('gh-1')).toEqual({
      groupHash: 'gh-1',
      ruleId: 'rule-1',
      lastDeactivateAction: 'deactivate',
      lastSnoozeAction: 'snooze',
      snoozeExpiry: '2035-01-02T12:00:00.000Z',
      tags: ['t1', 't2'],
    });
  });

  it('normalizes string tags into a single-element array', async () => {
    const rows: GroupActionRow[] = [
      {
        group_hash: 'gh-2',
        rule_id: null,
        last_deactivate_action: null,
        last_snooze_action: null,
        snooze_expiry: null,
        tags: 'solo',
      },
    ];
    fetchGroupActionsMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['gh-2'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data!.has('gh-2')).toBe(true));
    expect(result.current.data!.get('gh-2')?.tags).toEqual(['solo']);
  });

  it('converts tags to empty array when row tags are null', async () => {
    const rows: GroupActionRow[] = [
      {
        group_hash: 'gh-3',
        rule_id: null,
        last_deactivate_action: null,
        last_snooze_action: null,
        snooze_expiry: null,
        tags: null,
      },
    ];
    fetchGroupActionsMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['gh-3'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data!.has('gh-3')).toBe(true));
    expect(result.current.data!.get('gh-3')?.tags).toEqual([]);
  });

  it('keeps the last row when duplicate group hashes are returned', async () => {
    const rows: GroupActionRow[] = [
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
    ];
    fetchGroupActionsMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['dup'],
          services: { expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data!.get('dup')?.ruleId).toBe('r2'));
  });
});
