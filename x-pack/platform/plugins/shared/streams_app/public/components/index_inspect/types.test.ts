/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getIndexInspectTargetKind,
  isIndexInspectTabAvailable,
  resolveIndexInspectTab,
} from './types';

describe('index inspect tabs', () => {
  it('classifies the target from metadata and loading state', () => {
    expect(getIndexInspectTargetKind({ metadataLoading: true })).toBe('loading');
    expect(getIndexInspectTargetKind({ metadataLoading: false })).toBe('unknown');
    expect(
      getIndexInspectTargetKind({ metadata: { is_data_stream: true }, metadataLoading: false })
    ).toBe('data_stream');
    expect(
      getIndexInspectTargetKind({ metadata: { is_data_stream: false }, metadataLoading: false })
    ).toBe('regular_index');
  });

  it('only offers data-stream-only tabs for confirmed data streams', () => {
    expect(isIndexInspectTabAvailable('retention', 'data_stream')).toBe(true);
    expect(isIndexInspectTabAvailable('retention', 'regular_index')).toBe(false);
    expect(isIndexInspectTabAvailable('retention', 'unknown')).toBe(false);
    expect(isIndexInspectTabAvailable('retention', 'loading')).toBe(false);
    expect(isIndexInspectTabAvailable('overview', 'regular_index')).toBe(true);
  });

  it('keeps the requested tab while loading and falls back once it is unavailable', () => {
    expect(resolveIndexInspectTab('retention', 'loading')).toBe('retention');
    expect(resolveIndexInspectTab('retention', 'data_stream')).toBe('retention');
    expect(resolveIndexInspectTab('retention', 'regular_index')).toBe('overview');
    expect(resolveIndexInspectTab('quality', 'data_stream')).toBe('overview');
    expect(resolveIndexInspectTab('retention', 'unknown')).toBe('overview');
    expect(resolveIndexInspectTab('bogus', 'data_stream')).toBe('overview');
    expect(resolveIndexInspectTab(undefined, 'loading')).toBe('overview');
  });
});
