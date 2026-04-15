/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildThresholdEvaluationQuery,
  escapeStatsFieldReference,
  formatScheduleEveryToEsqlDuration,
  formatThresholdFromClause,
  THRESHOLD_BUILDER_DEFAULT_FROM,
} from './build_threshold_evaluation_query';

describe('formatScheduleEveryToEsqlDuration', () => {
  it('maps short intervals to ES|QL duration literals', () => {
    expect(formatScheduleEveryToEsqlDuration('5m')).toBe('5 minutes');
    expect(formatScheduleEveryToEsqlDuration('1m')).toBe('1 minute');
    expect(formatScheduleEveryToEsqlDuration('1h')).toBe('1 hour');
    expect(formatScheduleEveryToEsqlDuration('30s')).toBe('30 seconds');
  });

  it('passes through values that already contain spaces', () => {
    expect(formatScheduleEveryToEsqlDuration('5 minutes')).toBe('5 minutes');
  });
});

describe('buildThresholdEvaluationQuery', () => {
  it('returns a minimal query when there are no complete stat rows', () => {
    expect(buildThresholdEvaluationQuery([], [])).toBe(
      `${THRESHOLD_BUILDER_DEFAULT_FROM}\n| LIMIT 1`
    );
    expect(buildThresholdEvaluationQuery([{ label: '', aggregation: 'avg', field: 'x' }], [])).toBe(
      `${THRESHOLD_BUILDER_DEFAULT_FROM}\n| LIMIT 1`
    );
  });

  it('builds STATS with ES|QL alias = agg syntax and optional BY', () => {
    const q = buildThresholdEvaluationQuery(
      [
        { label: 'avg_cpu', aggregation: 'avg', field: 'system.cpu.total.norm.pct' },
        { label: 'max_mem', aggregation: 'max', field: 'system.memory.used.pct' },
      ],
      ['host.name']
    );
    expect(q).toContain('| STATS');
    expect(q).toContain('avg_cpu = AVG(');
    expect(q).toContain('max_mem = MAX(');
    expect(q).toMatch(/,\n {8}max_mem = MAX/);
    expect(q).toContain('\n    BY ');
    expect(q).toContain(escapeStatsFieldReference('host.name'));
  });

  it('supports COUNT without a field using COUNT(*)', () => {
    const q = buildThresholdEvaluationQuery(
      [{ label: 'events', aggregation: 'count', field: '' }],
      []
    );
    expect(q).toContain('events = COUNT(*)');
  });

  it('uses the selected data source in the FROM clause', () => {
    const q = buildThresholdEvaluationQuery(
      [{ label: 'events', aggregation: 'count', field: '' }],
      [],
      'metrics-system.cpu-default'
    );
    expect(q.startsWith('FROM metrics-system.cpu-default\n')).toBe(true);
  });

  it('defaults FROM to logs-* when data source is empty or omitted', () => {
    expect(formatThresholdFromClause(undefined)).toBe(THRESHOLD_BUILDER_DEFAULT_FROM);
    expect(formatThresholdFromClause('   ')).toBe(THRESHOLD_BUILDER_DEFAULT_FROM);
  });

  it('appends BY with BUCKET when time field and schedule every are provided', () => {
    const q = buildThresholdEvaluationQuery(
      [{ label: 'c', aggregation: 'count', field: '' }],
      ['host.name'],
      'metrics-system.cpu-default',
      undefined,
      undefined,
      '@timestamp',
      '5m'
    );
    expect(q).toContain('\n    BY ');
    expect(q).toContain(escapeStatsFieldReference('host.name'));
    expect(q).toContain('ts = BUCKET(');
    expect(q).toContain(escapeStatsFieldReference('@timestamp'));
    expect(q).toContain('5 minutes');
  });

  it('appends WHERE with AND when threshold conditions are set', () => {
    const q = buildThresholdEvaluationQuery(
      [
        { label: 'avg_cpu', aggregation: 'avg', field: 'system.cpu.total.norm.pct' },
        { label: 'max_mem', aggregation: 'max', field: 'system.memory.used.pct' },
      ],
      [],
      'metrics-*',
      [
        { statLabel: 'avg_cpu', operator: 'gt', value: '0.8' },
        { statLabel: 'max_mem', operator: 'gt', value: '0.9' },
      ],
      'and'
    );
    expect(q).toContain('\n| WHERE ');
    expect(q).toContain('AND');
    expect(q).toContain('avg_cpu > 0.8');
    expect(q).toContain('max_mem > 0.9');
  });

  it('combines threshold conditions with OR when combinator is or', () => {
    const q = buildThresholdEvaluationQuery(
      [
        { label: 'a', aggregation: 'count', field: '' },
        { label: 'b', aggregation: 'count', field: '' },
      ],
      [],
      undefined,
      [
        { statLabel: 'a', operator: 'lt', value: '1' },
        { statLabel: 'b', operator: 'eq', value: '2' },
      ],
      'or'
    );
    expect(q).toContain('\n| WHERE ');
    expect(q).toMatch(/a < 1 OR b == 2/);
  });
});
