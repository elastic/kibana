/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRow } from './build_rows';

describe('buildRow', () => {
  const source = {
    '@timestamp': '2026-10-19T10:00:00.000Z',
    agent: { id: 'a1', name: 'host-1' },
    osquery: { pid: 42, name: 'bash' },
    'process.name': 'bash',
    'host.os.name': 'ubuntu',
    unrelated: 'x',
  };

  it('tags the row with the agent and keeps column values as strings', () => {
    const row = buildRow(source, []);

    expect(row.agent).toEqual({ id: 'a1', name: 'host-1' });
    expect(row['@timestamp']).toBe('2026-10-19T10:00:00.000Z');
    expect(row.columns).toEqual({ pid: '42', name: 'bash' });
  });

  it('keeps only the ecs_mapping keys in ecs', () => {
    expect(buildRow(source, ['process.name', 'missing.key']).ecs).toEqual({
      'process.name': 'bash',
    });
  });

  it('has an empty ecs object without a mapping', () => {
    expect(buildRow(source, []).ecs).toEqual({});
  });

  it('reads flattened osquery.* columns and dotted agent fields', () => {
    const row = buildRow({ 'agent.id': 'a2', 'agent.name': 'h2', 'osquery.port': 22 }, []);

    expect(row.agent).toEqual({ id: 'a2', name: 'h2' });
    expect(row.columns).toEqual({ port: '22' });
  });
});
