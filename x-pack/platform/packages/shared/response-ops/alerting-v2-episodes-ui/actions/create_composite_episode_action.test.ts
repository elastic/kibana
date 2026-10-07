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
import {
  createCompositeEpisodeAction,
  type CompositeActionDef,
  type CompositeActionDeps,
} from './create_composite_episode_action';
import * as composite from './execute_composite_action';

const makeEpisode = (id: string, overrides: Partial<AlertEpisode> = {}): AlertEpisode =>
  ({
    '@timestamp': '2026-04-23T00:00:00Z',
    'episode.id': id,
    'episode.status': 'active',
    'rule.id': 'r1',
    group_hash: id,
    first_timestamp: '2026-04-23T00:00:00Z',
    last_timestamp: '2026-04-23T00:00:00Z',
    duration: 0,
    ...overrides,
  } as AlertEpisode);

const makeSourceEpisode = (id: string): AlertEpisode =>
  ({
    ...makeEpisode(id),
    source_id: 'classic-alerts',
  } as AlertEpisode);

const makeDeps = (): CompositeActionDeps => ({
  http: httpServiceMock.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
});

const makeDef = (overrides: Partial<CompositeActionDef> = {}): CompositeActionDef => ({
  id: 'TEST_ACTION',
  order: 10,
  displayName: 'Test',
  iconType: 'check',
  isCompatible: () => true,
  execute: jest.fn().mockResolvedValue({ affected_count: 1, errors: [] }),
  ...overrides,
});

describe('createCompositeEpisodeAction', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('returns an EpisodeAction with the correct static properties', () => {
    const action = createCompositeEpisodeAction(makeDef(), undefined, makeDeps());
    expect(action.id).toBe('TEST_ACTION');
    expect(action.order).toBe(10);
    expect(action.displayName).toBe('Test');
    expect(action.iconType).toBe('check');
  });

  describe('isCompatible', () => {
    it('true when a native episode passes def.isCompatible', () => {
      const action = createCompositeEpisodeAction(
        makeDef({ isCompatible: (ep) => ep['episode.id'] === 'e1' }),
        undefined,
        makeDeps()
      );
      expect(action.isCompatible({ episodes: [makeEpisode('e1')] })).toBe(true);
    });

    it('false when no native episode passes and no extension', () => {
      const action = createCompositeEpisodeAction(
        makeDef({ isCompatible: () => false }),
        undefined,
        makeDeps()
      );
      expect(action.isCompatible({ episodes: [makeEpisode('e1'), makeSourceEpisode('s1')] })).toBe(
        false
      );
    });

    it('true when a source episode passes extension.isCompatible', () => {
      const extension: EpisodeActionExtension = {
        actionId: 'TEST_ACTION',
        isCompatible: () => true,
        execute: jest.fn(),
      };
      const action = createCompositeEpisodeAction(
        makeDef({ isCompatible: () => false }),
        extension,
        makeDeps()
      );
      expect(action.isCompatible({ episodes: [makeSourceEpisode('s1')] })).toBe(true);
    });

    it('false on empty episodes', () => {
      const action = createCompositeEpisodeAction(makeDef(), undefined, makeDeps());
      expect(action.isCompatible({ episodes: [] })).toBe(false);
    });
  });

  describe('execute', () => {
    it('calls executeCompositeAction with eligible episodes', async () => {
      const spy = jest.spyOn(composite, 'executeCompositeAction').mockResolvedValue(undefined);
      const deps = makeDeps();
      const def = makeDef();
      const onSuccess = jest.fn();
      const action = createCompositeEpisodeAction(def, undefined, deps);

      await action.execute({ episodes: [makeEpisode('e1')], onSuccess });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          episodes: [expect.objectContaining({ 'episode.id': 'e1' })],
          nativeExecute: def.execute,
          extension: undefined,
          deps,
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });

    it('skips execution when no episodes are eligible', async () => {
      const spy = jest.spyOn(composite, 'executeCompositeAction');
      const action = createCompositeEpisodeAction(
        makeDef({ isCompatible: () => false }),
        undefined,
        makeDeps()
      );
      const onSuccess = jest.fn();

      await action.execute({ episodes: [makeEpisode('e1')], onSuccess });

      expect(spy).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('shows danger toast on error and does not call onSuccess', async () => {
      jest.spyOn(composite, 'executeCompositeAction').mockRejectedValue(new Error('fail'));
      const deps = makeDeps();
      const onSuccess = jest.fn();
      const action = createCompositeEpisodeAction(makeDef(), undefined, deps);

      await action.execute({ episodes: [makeEpisode('e1')], onSuccess });

      expect(deps.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('filters eligible episodes correctly for mixed selection', async () => {
      const spy = jest.spyOn(composite, 'executeCompositeAction').mockResolvedValue(undefined);
      const extension: EpisodeActionExtension = {
        actionId: 'TEST_ACTION',
        isCompatible: (ep) => ep['episode.id'] === 's1',
        execute: jest.fn(),
      };
      const action = createCompositeEpisodeAction(
        makeDef({ isCompatible: (ep) => ep['episode.id'] === 'e1' }),
        extension,
        makeDeps()
      );

      await action.execute({
        episodes: [
          makeEpisode('e1'),
          makeEpisode('e2'),
          makeSourceEpisode('s1'),
          makeSourceEpisode('s2'),
        ],
      });

      const passedEpisodes = spy.mock.calls[0][0].episodes;
      expect(passedEpisodes).toHaveLength(2);
      expect(passedEpisodes.map((ep: AlertEpisode) => ep['episode.id'])).toEqual(['e1', 's1']);
    });
  });
});
