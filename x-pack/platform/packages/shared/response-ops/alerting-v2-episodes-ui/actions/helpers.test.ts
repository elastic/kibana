/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqueByGroup, successOrPartialToast } from './helpers';

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
  it('returns a success toast when everything processed', () => {
    const t = successOrPartialToast(3, 3);
    expect(t.color).toBe('success');
  });
  it('returns a warning toast on partial success', () => {
    const t = successOrPartialToast(2, 3);
    expect(t.color).toBe('warning');
  });
});
