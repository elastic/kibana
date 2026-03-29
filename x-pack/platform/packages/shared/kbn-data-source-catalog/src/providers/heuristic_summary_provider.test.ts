/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateHeuristicSummary } from './heuristic_summary_provider';
import type { DataSourceEntry } from '../types';

const makeEntry = (overrides: Partial<DataSourceEntry> = {}): DataSourceEntry => ({
  id: 'data_stream::logs-endpoint.events.process-default',
  name: 'logs-endpoint.events.process-default',
  type: 'data_stream',
  mapping: {
    fields: [
      { name: 'process.name', type: 'keyword', ecs: true, searchable: true, aggregatable: true },
      {
        name: 'process.command_line',
        type: 'keyword',
        ecs: true,
        searchable: true,
        aggregatable: true,
      },
      { name: 'host.name', type: 'keyword', ecs: true, searchable: true, aggregatable: true },
    ],
    total_field_count: 150,
    ecs_field_count: 120,
    ecs_field_coverage: 0.8,
  },
  integration: {
    package_name: 'endpoint',
    package_title: 'Elastic Defend',
    package_version: '9.0.0',
    dataset: 'endpoint.events.process',
    description: 'Protect your hosts with endpoint security',
    data_stream_title: 'Process Events',
  },
  catalog_version: 1,
  refreshed_at: '2026-03-26T00:00:00.000Z',
  ...overrides,
});

describe('generateHeuristicSummary', () => {
  it('generates summary with integration metadata', () => {
    const result = generateHeuristicSummary(makeEntry());
    expect(result.summary).toContain('Elastic Defend');
    expect(result.summary).toContain('Process Events');
    expect(result.summary).toContain('150 fields');
  });

  it('infers process execution topic from name and fields', () => {
    const result = generateHeuristicSummary(makeEntry());
    expect(result.topics).toContain('process execution');
    expect(result.topics).toContain('endpoint security');
    expect(result.topics).toContain('host');
  });

  it('infers MITRE techniques from fields', () => {
    const result = generateHeuristicSummary(makeEntry());
    expect(result.mitre_techniques).toContain('T1059'); // Command interpreter
    expect(result.mitre_techniques).toContain('T1106'); // Native API
  });

  it('handles entries without integration metadata', () => {
    const result = generateHeuristicSummary(makeEntry({ integration: undefined }));
    expect(result.summary).toContain('Data stream: logs-endpoint.events.process-default');
  });

  it('infers network topics from network-related fields', () => {
    const result = generateHeuristicSummary(
      makeEntry({
        name: 'logs-endpoint.events.network-default',
        mapping: {
          fields: [
            { name: 'source.ip', type: 'ip', ecs: true, searchable: true, aggregatable: true },
            {
              name: 'destination.port',
              type: 'long',
              ecs: true,
              searchable: true,
              aggregatable: true,
            },
          ],
          total_field_count: 80,
          ecs_field_count: 60,
          ecs_field_coverage: 0.75,
        },
      })
    );
    expect(result.topics).toContain('network');
    expect(result.mitre_techniques).toContain('T1071');
  });
});
