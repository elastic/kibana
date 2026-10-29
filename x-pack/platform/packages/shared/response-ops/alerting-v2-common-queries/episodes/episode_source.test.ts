/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EPISODE_SOURCE_FILTER_CLASSIC,
  EPISODE_SOURCE_FILTER_UNIVERSAL,
  NATIVE_EPISODE_SOURCE,
  isConnectorEpisodeSource,
  isEpisodeSourceFilterSystemId,
  sourceFilterIncludesClassic,
  sourceFilterIncludesV2,
} from './episode_source';

describe('isEpisodeSourceFilterSystemId', () => {
  it('recognizes the reserved Classic and Universal ids', () => {
    expect(isEpisodeSourceFilterSystemId(EPISODE_SOURCE_FILTER_CLASSIC)).toBe(true);
    expect(isEpisodeSourceFilterSystemId(EPISODE_SOURCE_FILTER_UNIVERSAL)).toBe(true);
  });

  it('rejects connector slugs and the native source', () => {
    expect(isEpisodeSourceFilterSystemId('zabbix')).toBe(false);
    expect(isEpisodeSourceFilterSystemId(NATIVE_EPISODE_SOURCE)).toBe(false);
  });
});

describe('isConnectorEpisodeSource', () => {
  it('accepts a connector slug', () => {
    expect(isConnectorEpisodeSource('zabbix')).toBe(true);
    expect(isConnectorEpisodeSource('datadog')).toBe(true);
  });

  it('drops empty, native, and values that collide with the reserved system ids', () => {
    expect(isConnectorEpisodeSource('')).toBe(false);
    expect(isConnectorEpisodeSource(null)).toBe(false);
    expect(isConnectorEpisodeSource(undefined)).toBe(false);
    expect(isConnectorEpisodeSource(NATIVE_EPISODE_SOURCE)).toBe(false);
    expect(isConnectorEpisodeSource(EPISODE_SOURCE_FILTER_CLASSIC)).toBe(false);
    expect(isConnectorEpisodeSource(EPISODE_SOURCE_FILTER_UNIVERSAL)).toBe(false);
  });
});

describe('source filter pipeline selection', () => {
  it('includes both pipelines when nothing is selected', () => {
    expect(sourceFilterIncludesClassic(undefined)).toBe(true);
    expect(sourceFilterIncludesClassic([])).toBe(true);
    expect(sourceFilterIncludesV2(null)).toBe(true);
  });

  it('includes only the classic pipeline for a Classic selection', () => {
    expect(sourceFilterIncludesClassic([EPISODE_SOURCE_FILTER_CLASSIC])).toBe(true);
    expect(sourceFilterIncludesV2([EPISODE_SOURCE_FILTER_CLASSIC])).toBe(false);
  });

  it('includes only the v2 pipeline for Universal and connector selections', () => {
    const sources = [EPISODE_SOURCE_FILTER_UNIVERSAL, 'zabbix'];
    expect(sourceFilterIncludesClassic(sources)).toBe(false);
    expect(sourceFilterIncludesV2(sources)).toBe(true);
  });
});
