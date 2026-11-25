/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertKqlToEsqlExpression, EPISODE_KQL_FIELDS } from './kql_to_esql';

describe('convertKqlToEsqlExpression', () => {
  it.each([
    ['alert.status: active', '`episode.status` == "active"'],
    ['alert.id: alert-1', '`episode.id` == "alert-1"'],
    ['severity: critical', 'severity == "critical"'],
    ['data.host.name: web-01', 'JSON_EXTRACT(episode_data, "host.name") == "web-01"'],
    ['data.host.name: *', 'JSON_EXTRACT(episode_data, "host.name") IS NOT NULL'],
    ['data.host.name: web-*', 'JSON_EXTRACT(episode_data, "host.name") LIKE "web-*"'],
    ['data.enabled: true', 'JSON_EXTRACT(episode_data, "enabled") == "true"'],
    ['data.enabled: false', 'JSON_EXTRACT(episode_data, "enabled") == "false"'],
    ['data.count: 5', 'TO_DOUBLE(JSON_EXTRACT(episode_data, "count")) == 5'],
    ['data.count > 5', 'TO_DOUBLE(JSON_EXTRACT(episode_data, "count")) > 5'],
    ['data.count: "5"', 'JSON_EXTRACT(episode_data, "count") == "5"'],
    ['*', 'true'],
    ['*:*', 'true'],
    ['*: *', 'true'],
    [
      '@timestamp >= "2026-01-01T00:00:00.000Z"',
      '@timestamp >= TO_DATETIME("2026-01-01T00:00:00.000Z")',
    ],
  ])('converts %s', (kql, expected) => {
    expect(convertKqlToEsqlExpression(kql)).toBe(expected);
  });

  it('preserves KQL negation semantics for missing fields', () => {
    expect(convertKqlToEsqlExpression('NOT severity: critical')).toBe(
      'COALESCE(NOT (severity == "critical"), true)'
    );
  });

  it('converts boolean expressions', () => {
    expect(
      convertKqlToEsqlExpression(
        'alert.status: active AND (severity: critical OR NOT data.host.name: web-*)'
      )
    ).toBe(
      '(`episode.status` == "active" AND (severity == "critical" OR COALESCE(NOT (JSON_EXTRACT(episode_data, "host.name") LIKE "web-*"), true)))'
    );
  });

  it.each([
    'episode.id: test',
    'episode.status: active',
    'id: test',
    'status: active',
    'kibana.alert.rule.name: test',
    'message: test',
    'data.*: test',
    'duration > 5000',
    'test',
    'constructor: test',
    'toString: test',
    '__proto__: test',
  ])('does not apply unsupported KQL to v2 episodes: %s', (kql) => {
    expect(convertKqlToEsqlExpression(kql)).toBe('false');
  });

  it('does not advertise duration as a supported episode KQL field', () => {
    expect(EPISODE_KQL_FIELDS).not.toContainEqual({ name: 'duration', type: 'number' });
  });

  it('keeps the boolean structure when a predicate only applies to classic alerts', () => {
    expect(convertKqlToEsqlExpression('alert.status: active OR kibana.alert.status: active')).toBe(
      '(`episode.status` == "active" OR false)'
    );
  });

  it('preserves match-all expressions in boolean queries', () => {
    expect(convertKqlToEsqlExpression('* AND severity: critical')).toBe(
      '(true AND severity == "critical")'
    );
  });

  it.each([
    ['@timestamp > now-1d', '@timestamp', 'date value'],
    ['@timestamp > "2026-01-01"', '@timestamp', 'date value'],
    ['@timestamp > "2026-01-01T00:00:00Z"', '@timestamp', 'date value'],
    ['@timestamp > "2026-01-01T00:00:00.000+01:00"', '@timestamp', 'date value'],
    ['@timestamp > "2026-W01-1"', '@timestamp', 'date value'],
    ['@timestamp > "2026-02-30"', '@timestamp', 'date value'],
    ['@timestamp > "May 1, 2026"', '@timestamp', 'date value'],
    ['@timestamp: 2026-*', '@timestamp', 'wildcards are not supported'],
    ['data.enabled > true', 'data.enabled', 'string or numeric range value'],
  ])('rejects unsafe translation for %s', (kql, field, reason) => {
    expect(() => convertKqlToEsqlExpression(kql)).toThrow(
      `Unsupported episode KQL for ${field}: ${reason}`
    );
  });
});
