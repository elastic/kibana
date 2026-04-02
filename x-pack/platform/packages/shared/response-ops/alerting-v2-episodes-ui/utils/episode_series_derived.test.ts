/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import {
  getEpisodeDurationMs,
  getGroupHashFromEpisodeRows,
  getLastEpisodeStatus,
  getRuleIdFromEpisodeRows,
  getTriggeredTimestamp,
} from './episode_series_derived';

describe('episode_series_derived', () => {
  describe('getLastEpisodeStatus', () => {
    it('returns undefined for empty rows', () => {
      expect(getLastEpisodeStatus([])).toBeUndefined();
    });

    it('returns the status from the last row', () => {
      expect(
        getLastEpisodeStatus([
          { 'episode.status': ALERT_EPISODE_STATUS.PENDING },
          { 'episode.status': ALERT_EPISODE_STATUS.ACTIVE },
        ])
      ).toBe(ALERT_EPISODE_STATUS.ACTIVE);
    });
  });

  describe('getRuleIdFromEpisodeRows', () => {
    it('returns the first non-empty rule id', () => {
      expect(getRuleIdFromEpisodeRows([{ 'rule.id': '' }, { 'rule.id': 'rule-99' }])).toBe(
        'rule-99'
      );
    });

    it('returns undefined when no rule id string', () => {
      expect(getRuleIdFromEpisodeRows([{ other: 1 }])).toBeUndefined();
    });
  });

  describe('getTriggeredTimestamp', () => {
    it('returns the timestamp of the first active row', () => {
      expect(
        getTriggeredTimestamp([
          {
            'episode.status': ALERT_EPISODE_STATUS.PENDING,
            '@timestamp': '2020-01-01T00:00:00.000Z',
          },
          {
            'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
            '@timestamp': '2020-01-02T00:00:00.000Z',
          },
        ])
      ).toBe('2020-01-02T00:00:00.000Z');
    });
  });

  describe('getGroupHashFromEpisodeRows', () => {
    it('returns the first non-empty group_hash', () => {
      expect(getGroupHashFromEpisodeRows([{ group_hash: 'gh' }])).toBe('gh');
    });
  });

  describe('getEpisodeDurationMs', () => {
    it('returns undefined for fewer than two rows', () => {
      expect(getEpisodeDurationMs([{ '@timestamp': '2020-01-01T00:00:00.000Z' }])).toBeUndefined();
    });

    it('returns non-negative ms between first and last timestamp', () => {
      expect(
        getEpisodeDurationMs([
          { '@timestamp': '2020-01-01T00:00:00.000Z' },
          { '@timestamp': '2020-01-01T00:00:01.000Z' },
        ])
      ).toBe(1000);
    });

    it('returns undefined when timestamps are not parseable', () => {
      expect(getEpisodeDurationMs([{ '@timestamp': 'x' }, { '@timestamp': 'y' }])).toBeUndefined();
    });
  });
});
