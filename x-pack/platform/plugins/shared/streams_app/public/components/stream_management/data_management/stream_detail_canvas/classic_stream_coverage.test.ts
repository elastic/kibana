/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createClassicStreamDefinition } from '../shared/mocks/stream_definitions';
import {
  getUnownedClassicStreams,
  isClassicStreamCoveredByDestinations,
  matchesIndexPattern,
} from './classic_stream_coverage';

describe('matchesIndexPattern', () => {
  it('matches an exact static index', () => {
    expect(matchesIndexPattern('logs-app-default', 'logs-app-default')).toBe(true);
    expect(matchesIndexPattern('logs-app-other', 'logs-app-default')).toBe(false);
  });

  it('treats * as any sequence and ? as a single character', () => {
    expect(matchesIndexPattern('logs-nginx-default', 'logs-*-*')).toBe(true);
    expect(matchesIndexPattern('logs-nginx', 'logs-*-*')).toBe(false);
    expect(matchesIndexPattern('metrics-nginx-default', 'logs-*-*')).toBe(false);
    expect(matchesIndexPattern('logs-ab-default', 'logs-a?-default')).toBe(true);
    expect(matchesIndexPattern('logs-abc-default', 'logs-a?-default')).toBe(false);
  });
});

describe('isClassicStreamCoveredByDestinations', () => {
  it('covers auto destinations with the signal write pattern', () => {
    expect(
      isClassicStreamCoveredByDestinations('logs-nginx-default', [{ signal: 'logs', mode: 'auto' }])
    ).toBe(true);
    expect(
      isClassicStreamCoveredByDestinations('metrics-cpu-default', [
        { signal: 'logs', mode: 'auto' },
      ])
    ).toBe(false);
  });

  it('covers a static destination only when the name matches the index', () => {
    expect(
      isClassicStreamCoveredByDestinations('logs-app-default', [
        { signal: 'logs', mode: 'static', index: 'logs-app-default' },
      ])
    ).toBe(true);
    expect(
      isClassicStreamCoveredByDestinations('logs-app-other', [
        { signal: 'logs', mode: 'static', index: 'logs-app-default' },
      ])
    ).toBe(false);
  });
});

describe('getUnownedClassicStreams', () => {
  const logsNginx = createClassicStreamDefinition('logs-nginx-default');
  const metricsCpu = createClassicStreamDefinition('metrics-cpu-default');
  const tracesApp = createClassicStreamDefinition('traces-app-default');

  it('keeps classics that no unit destination would list', () => {
    expect(
      getUnownedClassicStreams(
        [logsNginx, metricsCpu, tracesApp],
        [
          { signal: 'logs', mode: 'auto' },
          { signal: 'metrics', mode: 'static', index: 'metrics-other-default' },
        ]
      )
    ).toEqual([metricsCpu, tracesApp]);
  });

  it('returns every classic when there are no elasticsearch destinations', () => {
    expect(getUnownedClassicStreams([logsNginx], [])).toEqual([logsNginx]);
  });
});
