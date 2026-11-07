/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnContext } from '../cases_generator/types';
import type { LatencyStats } from './stats';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type Requester = <T>(method: Method, path: string, body?: unknown) => Promise<T>;

/** Sends Kibana requests as an internal origin, so internal routes accept them. */
export const createRequester =
  ({ kbnClient, headers }: KbnContext): Requester =>
  async <T>(method: Method, path: string, body?: unknown): Promise<T> => {
    const { data } = await kbnClient.request<T>({
      method,
      path,
      body,
      retries: 0,
      headers: { ...headers, 'x-elastic-internal-origin': 'kibana' },
    });
    return data;
  };

/** Creates a disabled rule whose saved object the rule write probe rewrites. */
export const createProbeRule = (request: Requester, tag: string): Promise<{ id: string }> =>
  request<{ id: string }>('POST', '/api/alerting/rule', {
    name: `${tag} probe`,
    tags: [tag],
    rule_type_id: '.index-threshold',
    consumer: 'stackAlerts',
    enabled: false,
    schedule: { interval: '1m' },
    actions: [],
    params: {
      index: [tag],
      timeField: '@timestamp',
      aggType: 'count',
      groupBy: 'all',
      thresholdComparator: '>',
      threshold: [1_000_000],
      timeWindowSize: 5,
      timeWindowUnit: 'm',
    },
  });

export const latencyRow = (stats: LatencyStats) => ({
  count: stats.count,
  'p50 ms': stats.p50,
  'p95 ms': stats.p95,
  'p99 ms': stats.p99,
  'max ms': stats.max,
});

/** Renders rows as an aligned text table for the tooling log. */
export const formatTable = (rows: Record<string, object>): string => {
  const cells = Object.entries(rows).map(
    ([name, row]) => [name, new Map<string, unknown>(Object.entries(row))] as const
  );
  const columns = [...new Set(cells.flatMap(([, row]) => [...row.keys()]))];
  const lines = [
    ['', ...columns],
    ...cells.map(([name, row]) => [
      name,
      ...columns.map((column) => String(row.get(column) ?? '')),
    ]),
  ];
  const widths = lines[0].map((_, index) => Math.max(...lines.map((line) => line[index].length)));
  return lines
    .map((line) => line.map((cell, index) => cell.padEnd(widths[index])).join('  '))
    .join('\n');
};
