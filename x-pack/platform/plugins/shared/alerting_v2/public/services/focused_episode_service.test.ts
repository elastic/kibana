/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS, type AlertEpisode } from '@kbn/alerting-v2-schemas';
import { FocusedEpisodeService } from './focused_episode_service';

const createEpisode = (episodeId: string): AlertEpisode => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  'episode.id': episodeId,
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-01-01T00:00:00.000Z',
  last_timestamp: '2026-01-01T01:00:00.000Z',
  duration: 3600000,
});

describe('FocusedEpisodeService', () => {
  it('stores and clears the focused episode', () => {
    const service = new FocusedEpisodeService();
    const episode = createEpisode('ep-1');

    service.setFocusedEpisode(episode);

    expect(service.getFocusedEpisode()).toBe(episode);

    service.clearFocusedEpisode('ep-1');

    expect(service.getFocusedEpisode()).toBeUndefined();
  });

  it('does not clear a newer focused episode with an older episode id', () => {
    const service = new FocusedEpisodeService();
    const firstEpisode = createEpisode('ep-1');
    const secondEpisode = createEpisode('ep-2');

    service.setFocusedEpisode(firstEpisode);
    service.setFocusedEpisode(secondEpisode);
    service.clearFocusedEpisode('ep-1');

    expect(service.getFocusedEpisode()).toBe(secondEpisode);
  });
});
