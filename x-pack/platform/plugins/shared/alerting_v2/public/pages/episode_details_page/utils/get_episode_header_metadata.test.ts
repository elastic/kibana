/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEpisodeHeaderMetadata } from './get_episode_header_metadata';

describe('getEpisodeHeaderMetadata', () => {
  const formatDate = (isoDate: string) => `formatted(${isoDate})`;

  it('returns triggered and duration text items when both are present', () => {
    const metadata = getEpisodeHeaderMetadata({
      triggeredAt: '2026-05-08T08:00:00.000Z',
      durationMs: 300000,
      formatDate,
    });

    expect(metadata).toEqual([
      expect.objectContaining({
        type: 'text',
        value: 'formatted(2026-05-08T08:00:00.000Z)',
        'data-test-subj': 'alertingV2EpisodeDetailsHeaderTriggeredMetadata',
      }),
      expect.objectContaining({
        type: 'text',
        'data-test-subj': 'alertingV2EpisodeDetailsHeaderDurationMetadata',
      }),
    ]);
  });

  it('omits the triggered item when triggeredAt is missing', () => {
    const metadata = getEpisodeHeaderMetadata({
      triggeredAt: undefined,
      durationMs: 300000,
      formatDate,
    });

    expect(metadata).toHaveLength(1);
    expect(metadata?.[0]).toMatchObject({
      'data-test-subj': 'alertingV2EpisodeDetailsHeaderDurationMetadata',
    });
  });

  it('returns undefined when there is nothing to show', () => {
    expect(
      getEpisodeHeaderMetadata({ triggeredAt: undefined, durationMs: undefined, formatDate })
    ).toBeUndefined();
  });
});
