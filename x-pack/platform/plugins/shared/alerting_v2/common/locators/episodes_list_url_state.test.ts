/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_EPISODES_LIST_TIME_RANGE,
  EPISODES_LIST_STATUS_URL_ALL,
  decodeEpisodesListRecord,
  encodeEpisodesListRecord,
  type EpisodesListUrlState,
} from './episodes_list_url_state';

describe('encodeEpisodesListRecord', () => {
  it('omits the default status (active)', () => {
    expect(encodeEpisodesListRecord({ status: 'active' })).toEqual({});
  });

  it('encodes a nil status as the "all" sentinel', () => {
    expect(encodeEpisodesListRecord({ status: undefined })).toEqual({
      status: EPISODES_LIST_STATUS_URL_ALL,
    });
    expect(encodeEpisodesListRecord({ status: null })).toEqual({
      status: EPISODES_LIST_STATUS_URL_ALL,
    });
  });

  it('encodes a non-default status verbatim', () => {
    expect(encodeEpisodesListRecord({ status: 'pending' })).toEqual({ status: 'pending' });
  });

  it('encodes ruleId, trimmed queryString, tags and assigneeUid', () => {
    expect(
      encodeEpisodesListRecord({
        status: 'active',
        ruleId: 'rule-1',
        queryString: '  host:web  ',
        tags: ['a', 'b'],
        assigneeUid: 'u-1',
      })
    ).toEqual({
      ruleId: 'rule-1',
      queryString: 'host:web',
      tags: ['a', 'b'],
      assigneeUid: 'u-1',
    });
  });

  it('drops empty strings and empty tag arrays', () => {
    expect(
      encodeEpisodesListRecord({ status: 'active', ruleId: '   ', queryString: '', tags: [] })
    ).toEqual({});
  });

  it('omits the default time range but encodes a custom one', () => {
    expect(
      encodeEpisodesListRecord({ status: 'active', timeRange: DEFAULT_EPISODES_LIST_TIME_RANGE })
    ).toEqual({});
    expect(
      encodeEpisodesListRecord({
        status: 'active',
        timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
      })
    ).toEqual({
      timeFrom: '2026-01-01T00:00:00.000Z',
      timeTo: '2026-01-02T00:00:00.000Z',
    });
  });

  it('encodes the histogram breakdown field', () => {
    expect(
      encodeEpisodesListRecord({ status: 'active', histogramBreakdownField: 'host.name' })
    ).toEqual({ histBreakdown: 'host.name' });
  });
});

describe('decodeEpisodesListRecord', () => {
  it('returns an empty state for non-object input', () => {
    expect(decodeEpisodesListRecord(undefined)).toEqual({});
    expect(decodeEpisodesListRecord('nope')).toEqual({});
  });

  it('decodes the "all" sentinel to a present-but-undefined status', () => {
    const decoded = decodeEpisodesListRecord({ status: EPISODES_LIST_STATUS_URL_ALL });
    expect('status' in decoded).toBe(true);
    expect(decoded.status).toBeUndefined();
  });

  it('decodes filter fields, time and histogram breakdown', () => {
    expect(
      decodeEpisodesListRecord({
        status: 'pending',
        ruleId: 'rule-1',
        queryString: 'host:web',
        tags: ['a'],
        assigneeUid: 'u-1',
        timeFrom: 'now-7d',
        timeTo: 'now',
        histBreakdown: 'host.name',
      })
    ).toEqual({
      status: 'pending',
      ruleId: 'rule-1',
      queryString: 'host:web',
      tags: ['a'],
      assigneeUid: 'u-1',
      timeRange: { from: 'now-7d', to: 'now' },
      histogramBreakdownField: 'host.name',
    });
  });

  it('ignores a partial time range', () => {
    expect(decodeEpisodesListRecord({ timeFrom: 'now-7d' }).timeRange).toBeUndefined();
  });
});

describe('encode/decode round-trip', () => {
  it.each<EpisodesListUrlState>([
    { status: 'pending', ruleId: 'rule-1' },
    { status: undefined, tags: ['a', 'b'] },
    {
      status: 'recovering',
      timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
    },
  ])('round-trips %j', (state) => {
    expect(decodeEpisodesListRecord(encodeEpisodesListRecord(state))).toEqual(state);
  });
});
