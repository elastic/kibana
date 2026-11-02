/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import { EpisodeSeverity } from '../components/severity/severity_utils';
import { deriveEpisodeSeverityTimelineData } from './derive_episode_severity_timeline_data';

const event = (timestamp: string, severity?: string, data?: string): EpisodeEventRow =>
  ({
    '@timestamp': timestamp,
    'episode.id': 'episode-1',
    'episode.status': 'active',
    severity,
    data,
  } as EpisodeEventRow);

describe('deriveEpisodeSeverityTimelineData', () => {
  it('merges consecutive events with the same severity', () => {
    expect(
      deriveEpisodeSeverityTimelineData(
        [
          event('2024-01-01T00:00:00.000Z', 'low'),
          event('2024-01-01T00:00:01.000Z', 'low'),
          event('2024-01-01T00:00:02.000Z', 'high'),
        ],
        Date.parse('2024-01-01T00:00:03.000Z')
      ).segments
    ).toEqual([
      {
        severity: EpisodeSeverity.Low,
        x0Ms: Date.parse('2024-01-01T00:00:00.000Z'),
        x1Ms: Date.parse('2024-01-01T00:00:02.000Z'),
        timestamp: '2024-01-01T00:00:00.000Z',
        eventData: null,
      },
      {
        severity: EpisodeSeverity.High,
        x0Ms: Date.parse('2024-01-01T00:00:02.000Z'),
        x1Ms: Date.parse('2024-01-01T00:00:03.000Z'),
        timestamp: '2024-01-01T00:00:02.000Z',
        eventData: null,
      },
    ]);
  });

  it('leaves gaps for events without a supported severity', () => {
    expect(
      deriveEpisodeSeverityTimelineData(
        [
          event('2024-01-01T00:00:00.000Z', 'medium'),
          event('2024-01-01T00:00:01.000Z'),
          event('2024-01-01T00:00:02.000Z', 'medium'),
        ],
        Date.parse('2024-01-01T00:00:03.000Z')
      ).segments
    ).toEqual([
      {
        severity: EpisodeSeverity.Medium,
        x0Ms: Date.parse('2024-01-01T00:00:00.000Z'),
        x1Ms: Date.parse('2024-01-01T00:00:01.000Z'),
        timestamp: '2024-01-01T00:00:00.000Z',
        eventData: null,
      },
      {
        severity: EpisodeSeverity.Medium,
        x0Ms: Date.parse('2024-01-01T00:00:02.000Z'),
        x1Ms: Date.parse('2024-01-01T00:00:03.000Z'),
        timestamp: '2024-01-01T00:00:02.000Z',
        eventData: null,
      },
    ]);
  });

  it('ignores invalid timestamps and zero-width spans', () => {
    expect(
      deriveEpisodeSeverityTimelineData(
        [event('invalid', 'critical'), event('2024-01-01T00:00:03.000Z', 'critical')],
        Date.parse('2024-01-01T00:00:03.000Z')
      ).segments
    ).toEqual([]);
  });

  it('retains the transition event data for the details preview', () => {
    expect(
      deriveEpisodeSeverityTimelineData(
        [event('2024-01-01T00:00:00.000Z', 'high', '{"host":"server-1"}')],
        Date.parse('2024-01-01T00:00:01.000Z')
      ).transitions
    ).toEqual([
      expect.objectContaining({
        timestamp: '2024-01-01T00:00:00.000Z',
        eventData: { host: 'server-1' },
      }),
    ]);
  });

  it('retains a terminal severity transition without creating a zero-width span', () => {
    const terminalTimestamp = '2024-01-01T00:00:01.000Z';
    const result = deriveEpisodeSeverityTimelineData(
      [
        event('2024-01-01T00:00:00.000Z', 'high'),
        event(terminalTimestamp, 'low', '{"recovered":true}'),
      ],
      Date.parse(terminalTimestamp)
    );

    expect(result.segments).toHaveLength(1);
    expect(result.transitions).toEqual([
      expect.objectContaining({
        severity: EpisodeSeverity.High,
        timestampMs: Date.parse('2024-01-01T00:00:00.000Z'),
      }),
      {
        severity: EpisodeSeverity.Low,
        timestampMs: Date.parse(terminalTimestamp),
        timestamp: terminalTimestamp,
        eventData: { recovered: true },
      },
    ]);
  });
});
