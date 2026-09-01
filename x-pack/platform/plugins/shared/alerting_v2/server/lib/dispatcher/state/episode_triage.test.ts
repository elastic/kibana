/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertEpisode } from '../fixtures/test_utils';
import { EpisodeTriage } from './episode_triage';

describe('EpisodeTriage', () => {
  describe('partition', () => {
    it('splits episodes by the returned reason', () => {
      const keep = createAlertEpisode({ episode_id: 'keep' });
      const drop = createAlertEpisode({ episode_id: 'drop' });

      const triage = EpisodeTriage.partition([keep, drop], (episode) =>
        episode.episode_id === 'drop' ? 'ack' : undefined
      );

      expect(triage.dispatchable).toEqual([keep]);
      expect(triage.suppressed).toEqual([{ ...drop, reason: 'ack' }]);
    });
  });

  describe('suppressDispatchableWhere', () => {
    it('moves newly suppressed episodes after the already-suppressed ones', () => {
      const initial = EpisodeTriage.partition(
        [
          createAlertEpisode({ episode_id: 'e1' }),
          createAlertEpisode({ episode_id: 'e2' }),
          createAlertEpisode({ episode_id: 'e3' }),
        ],
        (episode) => (episode.episode_id === 'e1' ? 'snooze' : undefined)
      );

      const result = initial.suppressDispatchableWhere((episode) =>
        episode.episode_id === 'e3' ? 'maintenance_window:mw-1' : undefined
      );

      expect(result.dispatchable.map((e) => e.episode_id)).toEqual(['e2']);
      expect(result.suppressed.map((e) => [e.episode_id, e.reason])).toEqual([
        ['e1', 'snooze'],
        ['e3', 'maintenance_window:mw-1'],
      ]);
      // The original instance is untouched.
      expect(initial.dispatchable).toHaveLength(2);
      expect(initial.suppressed).toHaveLength(1);
    });

    it('returns the same instance when nothing is newly suppressed', () => {
      const initial = EpisodeTriage.partition(
        [createAlertEpisode({ episode_id: 'e1' })],
        () => undefined
      );

      expect(initial.suppressDispatchableWhere(() => undefined)).toBe(initial);
    });
  });

  describe('mapDispatchable', () => {
    it('replaces dispatchable episodes 1:1 and keeps suppressed intact', () => {
      const initial = EpisodeTriage.partition(
        [createAlertEpisode({ episode_id: 'e1' }), createAlertEpisode({ episode_id: 'e2' })],
        (episode) => (episode.episode_id === 'e2' ? 'ack' : undefined)
      );

      const result = initial.mapDispatchable((episode) => ({ ...episode, data: { a: 1 } }));

      expect(result.dispatchable).toEqual([
        expect.objectContaining({ episode_id: 'e1', data: { a: 1 } }),
      ]);
      expect(result.suppressed).toBe(initial.suppressed);
    });
  });

  describe('dispatchable accessors', () => {
    const triage = EpisodeTriage.partition(
      [
        createAlertEpisode({ episode_id: 'e1', rule_id: 'r1' }),
        createAlertEpisode({ episode_id: 'e1', rule_id: 'r1' }),
        createAlertEpisode({ episode_id: 'e2', rule_id: null, source: 'pagerduty' }),
      ],
      () => undefined
    );

    it('exposes unique dispatchable episode ids', () => {
      expect(triage.dispatchableEpisodeIds()).toEqual(['e1', 'e2']);
    });

    it('exposes unique non-null dispatchable rule ids', () => {
      expect(triage.dispatchableRuleIds()).toEqual(['r1']);
    });

    it('reports dispatchable presence', () => {
      expect(triage.hasDispatchable()).toBe(true);
      expect(EpisodeTriage.empty().hasDispatchable()).toBe(false);
    });
  });
});
