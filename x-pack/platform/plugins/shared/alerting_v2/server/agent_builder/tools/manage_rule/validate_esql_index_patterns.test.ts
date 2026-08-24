/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findConcreteGenerationIndices,
  suggestWildcardPattern,
} from './validate_esql_index_patterns';

describe('suggestWildcardPattern', () => {
  it('strips date and generation suffix', () => {
    expect(suggestWildcardPattern('logs-nginx.access-default-2026.06.11-000001')).toBe(
      'logs-nginx.access-default-*'
    );
  });

  it('strips .ds- prefix and generation suffix from data stream backing indices', () => {
    expect(suggestWildcardPattern('.ds-logs-nginx.access-default-2026.06.11-000001')).toBe(
      'logs-nginx.access-default-*'
    );
  });

  it('strips ILM generation suffix', () => {
    expect(suggestWildcardPattern('my-logs-000001')).toBe('my-logs-*');
  });

  it('strips daily date suffix', () => {
    expect(suggestWildcardPattern('logstash-2024.01.15')).toBe('logstash-*');
  });

  it('preserves CCS remote cluster prefix', () => {
    expect(
      suggestWildcardPattern('remote_cluster:.ds-logs-nginx.access-default-2026.06.11-000001')
    ).toBe('remote_cluster:logs-nginx.access-default-*');
  });
});

describe('findConcreteGenerationIndices', () => {
  it('detects date+generation concrete indices', () => {
    const { matches } = findConcreteGenerationIndices(
      'FROM logs-nginx.access-default-2026.06.11-000001 | STATS COUNT(*)'
    );
    expect(matches).toEqual([
      {
        index: 'logs-nginx.access-default-2026.06.11-000001',
        suggestion: 'logs-nginx.access-default-*',
      },
    ]);
  });

  it('detects .ds- backing indices', () => {
    const { matches } = findConcreteGenerationIndices(
      'FROM .ds-metrics-system.cpu-default-2024.12.08-000001 | STATS COUNT(*)'
    );
    expect(matches).toEqual([
      {
        index: '.ds-metrics-system.cpu-default-2024.12.08-000001',
        suggestion: 'metrics-system.cpu-default-*',
      },
    ]);
  });

  it('detects ILM generation suffixes', () => {
    const { matches } = findConcreteGenerationIndices('FROM my-logs-000001 | STATS COUNT(*)');
    expect(matches).toEqual([{ index: 'my-logs-000001', suggestion: 'my-logs-*' }]);
  });

  it('detects daily indices', () => {
    const { matches } = findConcreteGenerationIndices('FROM logstash-2024.01.15 | STATS COUNT(*)');
    expect(matches).toEqual([{ index: 'logstash-2024.01.15', suggestion: 'logstash-*' }]);
  });

  it('detects CCS-prefixed concrete generation indices', () => {
    const { matches } = findConcreteGenerationIndices(
      'FROM remote:logs-nginx.access-default-2026.06.11-000001 | STATS COUNT(*)'
    );
    expect(matches).toEqual([
      {
        index: 'remote:logs-nginx.access-default-2026.06.11-000001',
        suggestion: 'remote:logs-nginx.access-default-*',
      },
    ]);
  });

  it('does not flag plain fixed index names', () => {
    const { matches } = findConcreteGenerationIndices(
      'FROM kibana_sample_data_flights | STATS COUNT(*)'
    );
    expect(matches).toEqual([]);
  });

  it('does not flag wildcard patterns', () => {
    expect(findConcreteGenerationIndices('FROM logs-* | STATS COUNT(*)').matches).toEqual([]);
    expect(
      findConcreteGenerationIndices('FROM logs-nginx.access-* | STATS COUNT(*)').matches
    ).toEqual([]);
    expect(
      findConcreteGenerationIndices('FROM metrics-system.cpu-* | STATS COUNT(*)').matches
    ).toEqual([]);
  });

  it('returns matches for each concrete source in a multi-index FROM', () => {
    const { matches } = findConcreteGenerationIndices(
      'FROM logs-a-2024.01.15, metrics-* | STATS COUNT(*)'
    );
    expect(matches).toEqual([{ index: 'logs-a-2024.01.15', suggestion: 'logs-a-*' }]);
  });

  describe('data stream wildcard patterns pass clean', () => {
    it.each([
      'FROM logs-* | STATS COUNT(*)',
      'FROM logs-nginx.access-* | STATS COUNT(*)',
      'FROM logs-nginx.access-default | STATS COUNT(*)',
      'FROM metrics-* | STATS COUNT(*)',
      'FROM metrics-system.cpu-* | STATS COUNT(*)',
      'FROM metrics-system.cpu-default | STATS COUNT(*)',
      'FROM traces-apm-* | STATS COUNT(*)',
      'FROM logs-endpoint.events.process-* | STATS COUNT(*)',
      'FROM logs-cloud.* | STATS COUNT(*)',
    ])('does not flag properly wildcarded data stream pattern: %s', (query) => {
      expect(findConcreteGenerationIndices(query).matches).toEqual([]);
    });

    it.each([
      [
        '.ds-logs-nginx.access-default-2026.06.11-000001',
        'logs-nginx.access-default-*',
      ],
      [
        '.ds-metrics-system.cpu-default-2024.12.08-000001',
        'metrics-system.cpu-default-*',
      ],
      [
        '.ds-logs-endpoint.events.process-default-2025.03.01-000003',
        'logs-endpoint.events.process-default-*',
      ],
      [
        '.ds-traces-apm-default-2025.07.22-000012',
        'traces-apm-default-*',
      ],
      [
        '.ds-logs-cloud.audit-default-2026.01.01-000001',
        'logs-cloud.audit-default-*',
      ],
    ])(
      'flags .ds- backing index %s and suggests %s',
      (backingIndex, expectedSuggestion) => {
        const { matches } = findConcreteGenerationIndices(
          `FROM ${backingIndex} | STATS COUNT(*)`
        );
        expect(matches).toEqual([
          { index: backingIndex, suggestion: expectedSuggestion },
        ]);
      }
    );

    it('does not flag a .ds- prefixed name that already uses a wildcard', () => {
      expect(
        findConcreteGenerationIndices('FROM .ds-logs-* | STATS COUNT(*)').matches
      ).toEqual([]);
    });
  });
});
