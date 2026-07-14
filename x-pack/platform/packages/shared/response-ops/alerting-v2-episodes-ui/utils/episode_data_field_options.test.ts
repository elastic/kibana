/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEpisodeDataFieldOptions } from './episode_data_field_options';

describe('getEpisodeDataFieldOptions', () => {
  it('returns sorted, data-prefixed scalar fields from episode data', () => {
    const options = getEpisodeDataFieldOptions([
      { episode_data: JSON.stringify({ 'host.name': 'srv-01', bytes: 100, healthy: true }) },
    ]);

    expect(options).toEqual(['data.bytes', 'data.healthy', 'data.host.name']);
  });

  it('unions fields across the selected episodes without duplicates', () => {
    const options = getEpisodeDataFieldOptions([
      { episode_data: JSON.stringify({ 'host.name': 'srv-01' }) },
      { episode_data: JSON.stringify({ 'host.name': 'srv-02', env: 'prod' }) },
    ]);

    expect(options).toEqual(['data.env', 'data.host.name']);
  });

  it('skips nested objects and arrays (not evaluable by the dispatcher)', () => {
    const options = getEpisodeDataFieldOptions([
      {
        episode_data: JSON.stringify({
          scalar: 1,
          nested: { a: 1 },
          list: [1, 2],
          nil: null,
        }),
      },
    ]);

    expect(options).toEqual(['data.scalar']);
  });

  it('handles missing, empty, and malformed episode data', () => {
    const options = getEpisodeDataFieldOptions([
      { episode_data: null },
      { episode_data: undefined },
      { episode_data: '{}' },
      { episode_data: 'not-json' },
    ]);

    expect(options).toEqual([]);
  });

  it('accepts already-parsed data objects', () => {
    const options = getEpisodeDataFieldOptions([
      { episode_data: { 'host.name': 'srv-01' } as unknown as string },
    ]);

    expect(options).toEqual(['data.host.name']);
  });
});
