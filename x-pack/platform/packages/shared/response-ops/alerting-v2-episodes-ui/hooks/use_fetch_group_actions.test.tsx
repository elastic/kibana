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
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import type { AlertEpisodeGroupAction } from '../types/action';
import { getGroupAction, getGroupActionKey, useFetchGroupActions } from './use_fetch_group_actions';

jest.mock('../apis/fetch_group_actions');

const fetchGroupActionsMock = jest.mocked(fetchGroupActions);
const mockExpressions = {} as ExpressionsStart;
const mockSpaces = createMockSpaces();

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
          services: { expressions: mockExpressions, spaces: mockSpaces },
        }),
      { wrapper }
    );
    expect(fetchGroupActionsMock).not.toHaveBeenCalled();
  });

  it('fetches and builds groupActionsMap keyed by rule and group hash', async () => {
    const rows: GroupActionRow[] = [
      {
        group_hash: 'gh-1',
        rule_id: 'rule-1',
        last_deactivate_action: 'deactivate',
        last_snooze_action: 'snooze',
        snoozed_until: '2035-01-02T12:00:00.000Z',
        last_snooze_actor: 'actor-snooze',
        last_deactivate_actor: 'actor-deactivate',
      },
    ];
    fetchGroupActionsMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['gh-1'],
          services: { expressions: mockExpressions, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data!.get('rule-1:gh-1')).toEqual({
      groupHash: 'gh-1',
      ruleId: 'rule-1',
      lastDeactivateAction: 'deactivate',
      lastSnoozeAction: 'snooze',
      snoozedUntil: '2035-01-02T12:00:00.000Z',
      lastSnoozeActor: 'actor-snooze',
      lastDeactivateActor: 'actor-deactivate',
    });
  });

  it('keeps actions from different rules that share a group hash', async () => {
    const rows: GroupActionRow[] = [
      {
        group_hash: 'dup',
        rule_id: 'r1',
        last_deactivate_action: null,
        last_snooze_action: 'snooze',
        snoozed_until: null,
        last_snooze_actor: null,
        last_deactivate_actor: null,
      },
      {
        group_hash: 'dup',
        rule_id: 'r2',
        last_deactivate_action: 'deactivate',
        last_snooze_action: null,
        snoozed_until: null,
        last_snooze_actor: null,
        last_deactivate_actor: null,
      },
    ];
    fetchGroupActionsMock.mockResolvedValue(rows);

    const { result } = renderHook(
      () =>
        useFetchGroupActions({
          groupHashes: ['dup'],
          services: { expressions: mockExpressions, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.data?.size).toBe(2));
    expect(result.current.data?.get('r1:dup')?.lastSnoozeAction).toBe('snooze');
    expect(result.current.data?.get('r2:dup')?.lastDeactivateAction).toBe('deactivate');
  });
});

describe('getGroupAction', () => {
  const mockGroupAction = (ruleId: string | null): AlertEpisodeGroupAction => ({
    groupHash: 'gh-1',
    ruleId,
    lastDeactivateAction: null,
    lastSnoozeAction: 'snooze',
    snoozedUntil: null,
    lastSnoozeActor: null,
    lastDeactivateActor: null,
  });

  it('returns the actions of the rule', () => {
    const mockMap = new Map([
      [getGroupActionKey('rule-a', 'gh-1'), mockGroupAction('rule-a')],
      [getGroupActionKey(null, 'gh-1'), mockGroupAction(null)],
    ]);

    expect(getGroupAction(mockMap, 'rule-a', 'gh-1')?.ruleId).toBe('rule-a');
  });

  it("doesn't return the actions of another rule on the same group hash", () => {
    const mockMap = new Map([[getGroupActionKey('rule-a', 'gh-1'), mockGroupAction('rule-a')]]);

    expect(getGroupAction(mockMap, 'rule-b', 'gh-1')).toBeUndefined();
  });

  it('falls back to the actions without a rule', () => {
    const mockMap = new Map([[getGroupActionKey(null, 'gh-1'), mockGroupAction(null)]]);

    expect(getGroupAction(mockMap, 'rule-b', 'gh-1')?.ruleId).toBeNull();
    expect(getGroupAction(mockMap, undefined, 'gh-1')?.ruleId).toBeNull();
  });

  it('returns undefined without a map', () => {
    expect(getGroupAction(undefined, 'rule-a', 'gh-1')).toBeUndefined();
  });
});
