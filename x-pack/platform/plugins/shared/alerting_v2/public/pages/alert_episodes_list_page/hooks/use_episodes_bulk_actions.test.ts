/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEpisodesBulkActions } from './use_episodes_bulk_actions';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';

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
      expect.objectContaining({ key: 'STUB', label: 'Stub', icon: 'star' }),
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
});
