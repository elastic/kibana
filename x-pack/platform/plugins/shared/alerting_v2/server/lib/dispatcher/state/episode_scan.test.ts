/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertEpisode } from '../fixtures/test_utils';
import { EpisodeScan } from './episode_scan';

describe('EpisodeScan', () => {
  describe('empty', () => {
    it('has no episodes and is not truncated', () => {
      const scan = EpisodeScan.empty();

      expect(scan.episodes).toHaveLength(0);
      expect(scan.truncated).toBe(false);
      expect(scan.isEmpty()).toBe(true);
    });
  });

  describe('of', () => {
    it('exposes the given episodes and truncation flag', () => {
      const episodes = [createAlertEpisode({ episode_id: 'e1' })];
      const scan = EpisodeScan.of({ episodes, truncated: true });

      expect(scan.episodes).toBe(episodes);
      expect(scan.truncated).toBe(true);
      expect(scan.isEmpty()).toBe(false);
    });

    it('defaults truncated to false', () => {
      expect(EpisodeScan.of({ episodes: [createAlertEpisode()] }).truncated).toBe(false);
    });
  });

  describe('truncationEdge', () => {
    it('returns the last episode timestamp (rows sorted asc)', () => {
      const scan = EpisodeScan.of({
        episodes: [
          createAlertEpisode({
            episode_id: 'e1',
            last_event_timestamp: '2026-01-22T07:21:00.000Z',
          }),
          createAlertEpisode({
            episode_id: 'e2',
            last_event_timestamp: '2026-01-22T07:33:00.000Z',
          }),
        ],
        truncated: true,
      });

      expect(scan.truncationEdge()?.toISOString()).toBe('2026-01-22T07:33:00.000Z');
    });

    it('returns undefined when the scan is empty', () => {
      expect(EpisodeScan.empty().truncationEdge()).toBeUndefined();
    });

    it('returns an Invalid Date for a corrupt timestamp instead of throwing', () => {
      const scan = EpisodeScan.of({
        episodes: [createAlertEpisode({ last_event_timestamp: 'not-a-date' })],
        truncated: true,
      });

      const edge = scan.truncationEdge();
      expect(edge).toBeDefined();
      expect(Number.isNaN(edge!.getTime())).toBe(true);
    });
  });
});
