/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveTemplateSource } from './derive_template_source';

describe('deriveTemplateSource', () => {
  it('derives the data stream and integration from a FROM source', () => {
    expect(
      deriveTemplateSource('FROM logs-nginx.access-* | STATS errors = COUNT(*) BY host.name')
    ).toEqual({
      index_patterns: ['logs-nginx.access-*'],
      data_streams: [{ type: 'logs', dataset: 'nginx.access' }],
      integration: 'nginx',
    });
  });

  it('derives the data stream from a TS source', () => {
    expect(
      deriveTemplateSource('TS metrics-system.cpu-default | STATS cpu = AVG(system.cpu.pct)')
    ).toEqual({
      index_patterns: ['metrics-system.cpu-default'],
      data_streams: [{ type: 'metrics', dataset: 'system.cpu' }],
      integration: 'system',
    });
  });

  it('collects every data stream of a multi-source query owned by one integration', () => {
    expect(
      deriveTemplateSource('FROM logs-nginx.access-*, logs-nginx.error-* | STATS c = COUNT(*)')
    ).toEqual({
      index_patterns: ['logs-nginx.access-*', 'logs-nginx.error-*'],
      data_streams: [
        { type: 'logs', dataset: 'nginx.access' },
        { type: 'logs', dataset: 'nginx.error' },
      ],
      integration: 'nginx',
    });
  });

  it('omits the integration when sources span several integrations', () => {
    const source = deriveTemplateSource(
      'FROM logs-nginx.access-*, logs-apache.access-* | STATS c = COUNT(*)'
    );
    expect(source.data_streams).toHaveLength(2);
    expect(source).not.toHaveProperty('integration');
  });

  it('strips a cross-cluster prefix before parsing', () => {
    expect(deriveTemplateSource('FROM remote:logs-nginx.access-* | LIMIT 1')).toEqual({
      index_patterns: ['remote:logs-nginx.access-*'],
      data_streams: [{ type: 'logs', dataset: 'nginx.access' }],
      integration: 'nginx',
    });
  });

  it.each([
    ['logs-*', 'FROM logs-* | LIMIT 1'],
    ['metrics-*', 'TS metrics-* | LIMIT 1'],
    ['a wildcard dataset', 'FROM logs-*.access-* | LIMIT 1'],
  ])('derives nothing from the broad pattern %s', (_, query) => {
    const source = deriveTemplateSource(query);
    expect(source.data_streams).toEqual([]);
    expect(source).not.toHaveProperty('integration');
  });

  it('keeps the integration when only the dataset suffix is a wildcard', () => {
    expect(deriveTemplateSource('FROM logs-nginx.*-* | LIMIT 1')).toEqual({
      index_patterns: ['logs-nginx.*-*'],
      data_streams: [],
      integration: 'nginx',
    });
  });

  it('derives nothing from indices outside the data stream naming scheme', () => {
    expect(deriveTemplateSource('FROM orders, my-index | LIMIT 1')).toEqual({
      index_patterns: ['orders', 'my-index'],
      data_streams: [],
    });
  });
});
