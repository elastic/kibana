/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import type { AlertEpisode } from '../queries/episodes_query';
import type { EpisodeActionExtension } from '../types/episode_data_source';
import { executeCompositeAction } from './execute_composite_action';

const makeEpisode = (id: string): AlertEpisode =>
  ({
    '@timestamp': '2026-04-23T00:00:00Z',
    'episode.id': id,
    'episode.status': 'active',
    'rule.id': 'r1',
    group_hash: id,
    first_timestamp: '2026-04-23T00:00:00Z',
    last_timestamp: '2026-04-23T00:00:00Z',
    duration: 0,
  } as AlertEpisode);

const makeSourceEpisode = (id: string): AlertEpisode =>
  ({
    ...makeEpisode(id),
    source_id: 'classic-alerts',
    source_action_context: { index: '.alerts-test', alertUuid: id },
  } as AlertEpisode);

const makeDeps = () => ({
  http: httpServiceMock.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
});

describe('executeCompositeAction', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('calls nativeExecute only for native episodes when no extension is provided', async () => {
    const deps = makeDeps();
    const nativeExecute = jest.fn().mockResolvedValue({ affected_count: 2, errors: [] });

    await executeCompositeAction({
      episodes: [makeEpisode('e1'), makeEpisode('e2'), makeSourceEpisode('s1')],
      nativeExecute,
      deps,
    });

    expect(nativeExecute).toHaveBeenCalledTimes(1);
    expect(nativeExecute).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ 'episode.id': 'e1' }),
        expect.objectContaining({ 'episode.id': 'e2' }),
      ]),
      deps.http
    );
    expect(deps.notifications.toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'success' })
    );
  });

  it('calls extension.execute for source episodes when extension is provided', async () => {
    const deps = makeDeps();
    const nativeExecute = jest.fn().mockResolvedValue({ affected_count: 1, errors: [] });
    const extensionExecute = jest.fn().mockResolvedValue({ succeeded: 1, failed: 0 });
    const extension: EpisodeActionExtension = {
      actionId: 'test',
      isCompatible: () => true,
      execute: extensionExecute,
    };

    await executeCompositeAction({
      episodes: [makeEpisode('e1'), makeSourceEpisode('s1')],
      nativeExecute,
      extension,
      deps,
    });

    expect(nativeExecute).toHaveBeenCalledTimes(1);
    expect(extensionExecute).toHaveBeenCalledTimes(1);
    expect(extensionExecute).toHaveBeenCalledWith(
      [expect.objectContaining({ source_id: 'classic-alerts' })],
      deps.http,
      undefined
    );
  });

  it('filters source episodes by extension.isCompatible', async () => {
    const deps = makeDeps();
    const nativeExecute = jest.fn().mockResolvedValue(null);
    const extensionExecute = jest.fn().mockResolvedValue({ succeeded: 1, failed: 0 });
    const extension: EpisodeActionExtension = {
      actionId: 'test',
      isCompatible: (ep) => ep['episode.id'] === 's2',
      execute: extensionExecute,
    };

    await executeCompositeAction({
      episodes: [makeSourceEpisode('s1'), makeSourceEpisode('s2')],
      nativeExecute,
      extension,
      deps,
    });

    expect(nativeExecute).not.toHaveBeenCalled();
    expect(extensionExecute).toHaveBeenCalledWith(
      [expect.objectContaining({ 'episode.id': 's2' })],
      deps.http,
      undefined
    );
  });

  it('shows success toast when all succeed', async () => {
    const deps = makeDeps();
    const nativeExecute = jest.fn().mockResolvedValue({ affected_count: 2, errors: [] });

    await executeCompositeAction({
      episodes: [makeEpisode('e1'), makeEpisode('e2')],
      nativeExecute,
      deps,
    });

    expect(deps.notifications.toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'success' })
    );
  });

  it('shows warning toast on partial failure from BulkResponse errors', async () => {
    const deps = makeDeps();
    const nativeExecute = jest
      .fn()
      .mockResolvedValue({ affected_count: 1, errors: [{ message: 'err' }] });

    await executeCompositeAction({
      episodes: [makeEpisode('e1'), makeEpisode('e2')],
      nativeExecute,
      deps,
    });

    expect(deps.notifications.toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'warning' })
    );
  });

  it('shows no toast when there are no episodes to process', async () => {
    const deps = makeDeps();
    const nativeExecute = jest.fn();

    await executeCompositeAction({
      episodes: [],
      nativeExecute,
      deps,
    });

    expect(nativeExecute).not.toHaveBeenCalled();
    expect(deps.notifications.toasts.add).not.toHaveBeenCalled();
  });

  it('forwards extensionContext to extension.execute', async () => {
    const deps = makeDeps();
    const nativeExecute = jest.fn().mockResolvedValue(null);
    const extensionExecute = jest.fn().mockResolvedValue({ succeeded: 1, failed: 0 });
    const extension: EpisodeActionExtension<{ tags: string[] }> = {
      actionId: 'test',
      isCompatible: () => true,
      execute: extensionExecute,
    };

    await executeCompositeAction({
      episodes: [makeSourceEpisode('s1')],
      nativeExecute,
      extension,
      extensionContext: { tags: ['important'] },
      deps,
    });

    expect(extensionExecute).toHaveBeenCalledWith(expect.any(Array), deps.http, {
      tags: ['important'],
    });
  });

  it('combines native and source results in success toast', async () => {
    const deps = makeDeps();
    const nativeExecute = jest.fn().mockResolvedValue({ affected_count: 2, errors: [] });
    const extensionExecute = jest.fn().mockResolvedValue({ succeeded: 3, failed: 0 });
    const extension: EpisodeActionExtension = {
      actionId: 'test',
      isCompatible: () => true,
      execute: extensionExecute,
    };

    await executeCompositeAction({
      episodes: [makeEpisode('e1'), makeEpisode('e2'), makeSourceEpisode('s1')],
      nativeExecute,
      extension,
      deps,
    });

    expect(deps.notifications.toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'success' })
    );
  });

  it('shows warning toast when one side succeeds and the other rejects', async () => {
    const deps = makeDeps();
    const nativeExecute = jest.fn().mockResolvedValue({ affected_count: 1, errors: [] });
    const extensionExecute = jest.fn().mockRejectedValue(new Error('source failed'));
    const extension: EpisodeActionExtension = {
      actionId: 'test',
      isCompatible: () => true,
      execute: extensionExecute,
    };

    await executeCompositeAction({
      episodes: [makeEpisode('e1'), makeSourceEpisode('s1')],
      nativeExecute,
      extension,
      deps,
    });

    expect(deps.notifications.toasts.add).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'warning' })
    );
  });

  it('throws when all operations fail', async () => {
    const deps = makeDeps();
    const nativeExecute = jest.fn().mockRejectedValue(new Error('native failed'));

    await expect(
      executeCompositeAction({
        episodes: [makeEpisode('e1')],
        nativeExecute,
        deps,
      })
    ).rejects.toThrow('All composite action operations failed');

    expect(deps.notifications.toasts.add).not.toHaveBeenCalled();
  });
});
