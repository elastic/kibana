/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { getEpisodeHeaderMenu } from './get_episode_header_menu';

const mockEpisode = {
  '@timestamp': '2026-05-08T08:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': 'active' as const,
  'rule.id': 'rule-1',
  group_hash: 'group-1',
  first_timestamp: '2026-05-08T08:00:00.000Z',
  last_timestamp: '2026-05-08T08:05:00.000Z',
  triggered_at: '2026-05-08T08:00:00.000Z',
  duration: 300000,
  last_tags: ['tag-a'],
  last_assignee_uid: 'u-1',
} as AlertEpisode;

const createAction = (
  overrides: Partial<EpisodeAction> & Pick<EpisodeAction, 'id' | 'order'>
): EpisodeAction => ({
  displayName: overrides.id,
  iconType: 'starEmpty',
  isCompatible: () => true,
  execute: jest.fn(async () => {}),
  ...overrides,
});

describe('getEpisodeHeaderMenu', () => {
  it('maps actions to menu items with order and overflow flags', () => {
    const actions = [
      createAction({ id: 'ALERTING_V2_ACK_EPISODE', order: 10 }),
      createAction({ id: 'ALERTING_V2_EDIT_EPISODE_TAGS', order: 40 }),
      createAction({ id: 'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER', order: 50 }),
    ];
    const onSuccess = jest.fn();

    const menu = getEpisodeHeaderMenu({
      actions,
      episode: mockEpisode,
      onSuccess,
    });

    expect(menu.items).toHaveLength(2);
    expect(menu.items?.[0]).toMatchObject({
      id: 'ALERTING_V2_ACK_EPISODE',
      order: 10,
      overflow: false,
      testId: 'episodeActionsBar-primary-ALERTING_V2_ACK_EPISODE',
    });
    expect(menu.items?.[1]).toMatchObject({
      id: 'ALERTING_V2_EDIT_EPISODE_TAGS',
      order: 40,
      overflow: true,
      testId: 'episodeActionsBar-overflow-ALERTING_V2_EDIT_EPISODE_TAGS',
    });
    expect(menu.items?.[1]).not.toHaveProperty('separator');

    // Discover is rendered as the dedicated primaryActionItem, not among the ordered items, so
    // it always sits to the far right of the header, after the overflow trigger.
    expect(menu.primaryActionItem).toMatchObject({
      id: 'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER',
      testId: 'episodeActionsBar-primaryAction-ALERTING_V2_OPEN_EPISODE_IN_DISCOVER',
    });
  });

  it('invokes execute with the episode and onSuccess callback', async () => {
    const execute = jest.fn(async () => {});
    const onSuccess = jest.fn();
    const actions = [createAction({ id: 'ALERTING_V2_ACK_EPISODE', order: 10, execute })];

    const menu = getEpisodeHeaderMenu({
      actions,
      episode: mockEpisode,
      onSuccess,
    });

    await menu.items?.[0]?.run?.();

    expect(execute).toHaveBeenCalledWith({
      episodes: [mockEpisode],
      onSuccess,
    });
  });

  it('passes an empty episodes array when episode is undefined', async () => {
    const execute = jest.fn(async () => {});
    const onSuccess = jest.fn();
    const actions = [createAction({ id: 'ALERTING_V2_ACK_EPISODE', order: 10, execute })];

    const menu = getEpisodeHeaderMenu({
      actions,
      episode: undefined,
      onSuccess,
    });

    await menu.items?.[0]?.run?.();

    expect(execute).toHaveBeenCalledWith({
      episodes: [],
      onSuccess,
    });
  });

  it('overflows resolve and unresolve like the removed EpisodeActionsBar did', () => {
    const actions = [
      createAction({ id: 'ALERTING_V2_ACK_EPISODE', order: 10 }),
      createAction({ id: 'ALERTING_V2_RESOLVE_EPISODE', order: 20 }),
      createAction({ id: 'ALERTING_V2_UNRESOLVE_EPISODE', order: 21 }),
    ];
    const onSuccess = jest.fn();

    const menu = getEpisodeHeaderMenu({
      actions,
      episode: mockEpisode,
      onSuccess,
    });

    expect(menu.items?.[0]).toMatchObject({ id: 'ALERTING_V2_ACK_EPISODE', overflow: false });
    expect(menu.items?.[1]).toMatchObject({
      id: 'ALERTING_V2_RESOLVE_EPISODE',
      overflow: true,
      testId: 'episodeActionsBar-overflow-ALERTING_V2_RESOLVE_EPISODE',
    });
    expect(menu.items?.[1]).not.toHaveProperty('separator');

    expect(menu.items?.[2]).toMatchObject({
      id: 'ALERTING_V2_UNRESOLVE_EPISODE',
      overflow: true,
      testId: 'episodeActionsBar-overflow-ALERTING_V2_UNRESOLVE_EPISODE',
    });
  });

  it('invokes execute for the primary action item', async () => {
    const execute = jest.fn(async () => {});
    const onSuccess = jest.fn();
    const actions = [
      createAction({ id: 'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER', order: 50, execute }),
    ];

    const menu = getEpisodeHeaderMenu({
      actions,
      episode: mockEpisode,
      onSuccess,
    });

    await menu.primaryActionItem?.run?.();

    expect(execute).toHaveBeenCalledWith({
      episodes: [mockEpisode],
      onSuccess,
    });
  });
});
