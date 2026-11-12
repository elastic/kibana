/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultStreamsLayoutTab, isStreamsLayoutTab } from './tab_ids';

describe('defaultStreamsLayoutTab', () => {
  it('opens Classic for users with Streams access', () => {
    expect(defaultStreamsLayoutTab(true)).toBe('classic');
  });

  it('opens the Map without Streams access', () => {
    expect(defaultStreamsLayoutTab(false)).toBe('map');
  });
});

describe('isStreamsLayoutTab', () => {
  it.each(['map', 'sources', 'destinations', 'classic'])('accepts %s', (tab) => {
    expect(isStreamsLayoutTab(tab)).toBe(true);
  });

  it('rejects unknown tabs', () => {
    expect(isStreamsLayoutTab('bogus')).toBe(false);
  });
});
