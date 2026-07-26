/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode as decodeRison } from '@kbn/rison';
import { ALERTING_V2_EPISODES_BASE_PATH, paths } from './constants';

/** Parse the `_a` rison blob from the generated URL. */
const decodeAppState = (url: string): unknown => {
  const raw = new URL(url, 'http://localhost').searchParams.get('_a');
  if (!raw) return undefined;
  return (decodeRison(raw) as Record<string, unknown>)?.episodesList;
};

describe('paths.alertEpisodesListHref', () => {
  it('returns the base episodes path when called with no options', () => {
    expect(paths.alertEpisodesListHref()).toBe(ALERTING_V2_EPISODES_BASE_PATH);
  });

  it('returns the base episodes path when all filter fields are empty', () => {
    expect(paths.alertEpisodesListHref({ filters: {}, timeRange: undefined })).toBe(
      ALERTING_V2_EPISODES_BASE_PATH
    );
  });

  it('encodes ruleId into _a.episodesList', () => {
    const url = paths.alertEpisodesListHref({ filters: { ruleId: 'rule-1' } });
    expect(decodeAppState(url)).toMatchObject({ ruleId: 'rule-1' });
  });

  it('encodes groupHash and groupingValues into _a.episodesList', () => {
    const url = paths.alertEpisodesListHref({
      filters: {
        groupHash: 'abc123',
        groupingValues: { 'host.name': 'web-01', region: null },
      },
    });
    expect(decodeAppState(url)).toMatchObject({
      groupHash: 'abc123',
      groupingValues: { 'host.name': 'web-01', region: null },
    });
  });

  it('encodes timeRange as timeFrom/timeTo inside _a.episodesList, not in _g', () => {
    const url = paths.alertEpisodesListHref({
      filters: { ruleId: 'r1' },
      timeRange: { from: 'now-7d', to: 'now' },
    });
    expect(decodeAppState(url)).toMatchObject({ timeFrom: 'now-7d', timeTo: 'now' });
    expect(new URL(url, 'http://localhost').searchParams.has('_g')).toBe(false);
  });

  it('omits empty groupingValues objects', () => {
    const url = paths.alertEpisodesListHref({
      filters: { ruleId: 'r1', groupingValues: {} },
    });
    const state = decodeAppState(url) as Record<string, unknown>;
    expect(state).not.toHaveProperty('groupingValues');
  });

  it('encodes all fields together', () => {
    const url = paths.alertEpisodesListHref({
      filters: {
        ruleId: 'r1',
        groupHash: 'gh1',
        status: 'active',
        groupingValues: { env: 'prod' },
      },
      timeRange: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-07T00:00:00.000Z' },
    });
    expect(decodeAppState(url)).toEqual({
      ruleId: 'r1',
      groupHash: 'gh1',
      status: 'active',
      groupingValues: { env: 'prod' },
      timeFrom: '2024-01-01T00:00:00.000Z',
      timeTo: '2024-01-07T00:00:00.000Z',
    });
    expect(new URL(url, 'http://localhost').searchParams.has('_g')).toBe(false);
  });
});
