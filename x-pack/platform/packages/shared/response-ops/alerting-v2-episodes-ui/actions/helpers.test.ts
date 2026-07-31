/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  uniqueByGroup,
  successOrPartialToast,
  filterV2Episodes,
  isV1AlertEpisode,
} from './helpers';

const ep = (group_hash: string, id = group_hash) => ({ group_hash, 'episode.id': id } as any);

describe('uniqueByGroup', () => {
  it('dedupes by group_hash', () => {
    expect(uniqueByGroup([ep('g1'), ep('g1', 'x'), ep('g2')])).toHaveLength(2);
  });
  it('handles empty input', () => {
    expect(uniqueByGroup([])).toEqual([]);
  });
});

describe('successOrPartialToast', () => {
  it('returns a success toast when there are no errors', () => {
    const t = successOrPartialToast({ affected_count: 3, errors: [] });
    expect(t.color).toBe('success');
  });
  it('returns a warning toast when some items failed', () => {
    const t = successOrPartialToast({
      affected_count: 2,
      errors: [{ id: 'g1', error: { code: 'ALERT_GROUP_NOT_FOUND', message: 'not found' } }],
    });
    expect(t.color).toBe('warning');
  });
});

describe('isV1AlertEpisode / filterV2Episodes', () => {
  it('detects classic rows via _is_v1', () => {
    expect(isV1AlertEpisode({ _is_v1: true } as any)).toBe(true);
    expect(isV1AlertEpisode({} as any)).toBe(false);
  });

  it('drops classic rows from the actionable set', () => {
    const v1 = { 'episode.id': 'v1', _is_v1: true } as any;
    const v2 = { 'episode.id': 'v2' } as any;
    expect(filterV2Episodes([v1, v2])).toEqual([v2]);
  });
});
