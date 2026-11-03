/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEpisodesBulkActions } from './use_episodes_bulk_actions';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import { episodeSupportsActions } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';

const stubEpisode = (overrides: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-04-23T00:00:00Z',
  'episode.id': 'e1',
  group_hash: 'g1',
  ...overrides,
});

const stubAction = (overrides: Partial<EpisodeAction> = {}): EpisodeAction => ({
  id: 'STUB',
  order: 1,
  displayName: 'Stub',
  iconType: 'star',
  isCompatible: jest.fn(() => true),
  execute: jest.fn(async () => {}),
  ...overrides,
});

describe('useEpisodesBulkActions', () => {
  it('maps each action to a CustomBulkActions entry with correct label/icon', () => {
    const action = stubAction();
    const { result } = renderHook(() =>
      useEpisodesBulkActions({ actions: [action], episodesData: [], onSuccess: jest.fn() })
    );
    expect(result.current).toEqual([
      expect.objectContaining({
        key: 'STUB',
        'data-test-subj': 'episodesBulkAction-STUB',
        label: 'Stub',
        icon: 'star',
      }),
    ]);
  });

  it('isAvailable proxies to action.isCompatible with episodes resolved from docIds', () => {
    const episodesData = [stubEpisode({ 'episode.id': 'e1' })];
    const action = stubAction();
    const { result } = renderHook(() =>
      useEpisodesBulkActions({
        actions: [action],
        episodesData: episodesData as any,
        onSuccess: jest.fn(),
      })
    );
    result.current[0].isAvailable!({ selectedDocIds: ['0'] } as any);
    expect(action.isCompatible).toHaveBeenCalled();
  });

  it('onClick calls action.execute with selected episodes and onSuccess', () => {
    const onSuccess = jest.fn();
    const episodesData = [stubEpisode({ 'episode.id': 'e1' })];
    const action = stubAction();
    const { result } = renderHook(() =>
      useEpisodesBulkActions({ actions: [action], episodesData: episodesData as any, onSuccess })
    );
    result.current[0].onClick!({ selectedDocIds: ['0'] } as any);
    expect(action.execute).toHaveBeenCalledWith(expect.objectContaining({ onSuccess }));
  });

  it('returns an empty array when no actions are provided', () => {
    const { result } = renderHook(() =>
      useEpisodesBulkActions({ actions: [], episodesData: [], onSuccess: jest.fn() })
    );
    expect(result.current).toEqual([]);
  });

  it('handles undefined episodesData gracefully', () => {
    const action = stubAction();
    const { result } = renderHook(() =>
      useEpisodesBulkActions({ actions: [action], episodesData: undefined, onSuccess: jest.fn() })
    );
    result.current[0].isAvailable!({ selectedDocIds: ['0'] } as any);
    expect(action.isCompatible).toHaveBeenCalledWith({ episodes: [] });
  });

  describe('actions a classic alert cannot take', () => {
    const NOT_AVAILABLE = 'Not available for classic alerts';

    const classicOnlyUnsupportedAction = (overrides: Partial<EpisodeAction> = {}) =>
      stubAction({
        getBulkDisabledReason: (episodes) =>
          episodes.every(episodeSupportsActions) ? undefined : NOT_AVAILABLE,
        ...overrides,
      });

    const universalEpisode = stubEpisode({ 'episode.id': 'universal-ep' });
    const classicEpisode = stubEpisode({
      'episode.id': 'classic-ep',
      supports_actions: false,
    });

    const renderBulkActions = (action: EpisodeAction) =>
      renderHook(() =>
        useEpisodesBulkActions({
          actions: [action],
          episodesData: [universalEpisode, classicEpisode] as any,
          onSuccess: jest.fn(),
        })
      ).result;

    it.each([
      ['mixed classic and universal', ['universal-ep', 'classic-ep'], NOT_AVAILABLE],
      ['classic only', ['classic-ep'], NOT_AVAILABLE],
      ['universal only', ['universal-ep'], undefined],
    ])('reports the reason for a %s selection', (_name, selectedDocIds, expectedReason) => {
      const result = renderBulkActions(classicOnlyUnsupportedAction());

      expect(result.current[0].getDisabledReason!({ selectedDocIds } as any)).toBe(expectedReason);
    });

    it('reports no reason for an action that never declares one', () => {
      const result = renderBulkActions(stubAction());

      expect(
        result.current[0].getDisabledReason!({
          selectedDocIds: ['universal-ep', 'classic-ep'],
        } as any)
      ).toBeUndefined();
    });

    it('keeps an incompatible action in the menu while it has a reason', () => {
      const result = renderBulkActions(
        classicOnlyUnsupportedAction({ isCompatible: jest.fn(() => false) })
      );

      expect(result.current[0].isAvailable!({ selectedDocIds: ['classic-ep'] } as any)).toBe(true);
    });

    it('hides an incompatible action that has no reason', () => {
      const result = renderBulkActions(stubAction({ isCompatible: jest.fn(() => false) }));

      expect(result.current[0].isAvailable!({ selectedDocIds: ['universal-ep'] } as any)).toBe(
        false
      );
    });
  });

  it('filters out actions with supportsBulk set to false', () => {
    const bulkAction = stubAction({ id: 'BULK_ACTION' });
    const singleOnlyAction = stubAction({ id: 'SINGLE_ONLY', supportsBulk: false });

    const { result } = renderHook(() =>
      useEpisodesBulkActions({
        actions: [bulkAction, singleOnlyAction],
        episodesData: [],
        onSuccess: jest.fn(),
      })
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].key).toBe('BULK_ACTION');
  });
});
