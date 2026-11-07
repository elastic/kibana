/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lookUpCase, type CaseSummaries } from './connected_case_bridge_provider';

describe('lookUpCase', () => {
  const summaries: CaseSummaries = {
    byId: new Map([['seen', { id: 'seen', title: 'Seen', status: 'open' }]]),
    unavailable: new Set(['hidden']),
  };

  it('returns the case a finished read got back', () => {
    expect(lookUpCase(summaries, 'seen')?.title).toBe('Seen');
  });

  it('says unavailable only for a case a finished read asked for and did not get', () => {
    expect(lookUpCase(summaries, 'hidden')).toBeNull();
  });

  it('says not yet known for a case no finished read has asked for, such as while a new batch loads', () => {
    expect(lookUpCase(summaries, 'new-case')).toBeUndefined();
    expect(lookUpCase(undefined, 'seen')).toBeUndefined();
  });
});
