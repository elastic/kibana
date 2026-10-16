/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { routeDefinitions } from '.';

/**
 * Guards against unbounded request input (DoS hardening): every string and array reachable from a
 * shared APM route's params must declare an upper bound.
 *
 * Intentionally unbounded, because the value is the content of a size-limited multipart upload:
 *  - source map contents (`sources`, `names`, `sourcesContent`, `mappings`, ...)
 */
const ALLOWED_UNBOUNDED_PATHS = [/^POST \/api\/apm\/sourcemaps\b/];

interface ZodLike {
  _zod: { def: Record<string, any> };
}

const isZod = (value: unknown): value is ZodLike =>
  typeof value === 'object' && value !== null && '_zod' in value;

const findUnbounded = (schema: unknown, path: string, out: string[], seen = new Set<unknown>()) => {
  if (!isZod(schema) || seen.has(schema)) return;
  seen.add(schema);

  const { def } = schema._zod;
  // `.max()` / `.length()` are recorded as checks; formats such as uuid() are bounded by definition
  const hasLengthBound = ((def.checks as any[] | undefined) ?? []).some((check) =>
    ['max_length', 'length_equals'].includes(check?._zod?.def?.check)
  );

  if (def.type === 'string' && !hasLengthBound && typeof def.format !== 'string') {
    out.push(`${path}: string without .max()`);
  }
  if (def.type === 'array' && !hasLengthBound) out.push(`${path}: array without .max()`);

  if (def.shape) {
    for (const [key, child] of Object.entries(def.shape as Record<string, unknown>)) {
      findUnbounded(child, `${path}.${key}`, out, seen);
    }
  }
  if (def.type === 'lazy' && typeof def.getter === 'function') {
    findUnbounded(def.getter(), path, out, seen);
  }
  for (const key of [
    'element',
    'innerType',
    'keyType',
    'valueType',
    'in',
    'out',
    'left',
    'right',
  ]) {
    findUnbounded(def[key], `${path}${key === 'element' ? '[]' : ''}`, out, seen);
  }
  for (const option of (def.options as unknown[] | undefined) ?? []) {
    findUnbounded(option, path, out, seen);
  }
};

describe('shared APM route params', () => {
  const routes = Object.values(routeDefinitions)
    .flatMap((group) => Object.values(group as Record<string, { endpoint: string; params?: any }>))
    .filter(
      (route) => route.params && !ALLOWED_UNBOUNDED_PATHS.some((p) => p.test(route.endpoint))
    );

  it('finds the route definitions', () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it('declares an upper bound for every string and array', () => {
    const unbounded: string[] = [];
    for (const route of routes) {
      findUnbounded(route.params, route.endpoint, unbounded);
    }

    expect(unbounded).toEqual([]);
  });
});

describe('numeric and JSON-array route params', () => {
  const range = { start: '2023-01-01T00:00:00.000Z', end: '2023-01-02T00:00:00.000Z' };
  const { errors, services, profiling, serviceMap, sourceMaps } = routeDefinitions;

  describe('numBuckets', () => {
    const params = (numBuckets: number, groupIds: string = '["a"]') => ({
      path: { serviceName: 'opbeans-java' },
      query: { ...range, environment: 'ENVIRONMENT_ALL', kuery: '', numBuckets },
      body: { groupIds },
    });
    const route = errors.detailedStatistics;

    it.each([1, 8, 20, 100, 1000])('accepts %s', (numBuckets) => {
      expectParseSuccess(route.params!.safeParse(params(numBuckets)));
    });

    it.each([0, -1, 1001, 1.5, 1e9])('rejects %s', (numBuckets) => {
      expectParseError(route.params!.safeParse(params(numBuckets)));
    });

    it('rejects a groupIds array with more than 1000 items', () => {
      const ids = (n: number) => JSON.stringify(Array.from({ length: n }, (_, i) => `g${i}`));
      expectParseSuccess(route.params!.safeParse(params(20, ids(1000))));
      expectParseError(route.params!.safeParse(params(20, ids(1001))));
    });

    it('rejects an over-long JSON groupIds string', () => {
      expectParseError(route.params!.safeParse(params(20, `["${'a'.repeat(1_000_000)}"]`)));
    });
  });

  describe('paging', () => {
    const params = (query: Record<string, unknown>) => ({
      path: { serviceName: 'opbeans-java' },
      query: { environment: 'ENVIRONMENT_ALL', ...query },
    });

    it('accepts the UI paging values and rejects out of range ones', () => {
      const route = services.slos;
      expectParseSuccess(route.params!.safeParse(params({ page: 0, perPage: 1 })));
      expectParseSuccess(route.params!.safeParse(params({ page: 0, perPage: 10_000 })));
      expectParseError(route.params!.safeParse(params({ page: 0, perPage: 10_001 })));
      expectParseError(route.params!.safeParse(params({ page: 0, perPage: 0 })));
      expectParseError(route.params!.safeParse(params({ page: -1, perPage: 10 })));
    });
  });

  describe('source maps paging', () => {
    const route = sourceMaps.list;

    it('keeps accepting values that were valid before the limits were added', () => {
      expectParseSuccess(route.params!.safeParse({ query: { page: 1, perPage: 10 } }));
      expectParseSuccess(route.params!.safeParse({ query: { page: 0, perPage: 0 } }));
      expectParseSuccess(route.params!.safeParse({ query: { page: 1.5, perPage: 2.5 } }));
    });

    it('rejects values above the upper bounds', () => {
      expectParseSuccess(route.params!.safeParse({ query: { page: 100_000, perPage: 10_000 } }));
      expectParseError(route.params!.safeParse({ query: { page: 100_001 } }));
      expectParseError(route.params!.safeParse({ query: { perPage: 10_001 } }));
    });
  });

  describe('service map badges', () => {
    const route = serviceMap.serviceBadges;
    const params = (serviceNames: string[]) => ({
      query: { ...range, environment: 'ENVIRONMENT_ALL' },
      body: { serviceNames: JSON.stringify(serviceNames) },
    });
    const names = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);

    it('accepts every service of a large map and rejects more than 10,000', () => {
      expectParseSuccess(route.params!.safeParse(params(names(10_000))));
      expectParseError(route.params!.safeParse(params(names(10_001))));
    });
  });

  describe('profiling indices', () => {
    it('accepts 0..10 and rejects huge ranges', () => {
      const route = profiling.functions;
      const params = (startIndex: number, endIndex: number) => ({
        path: { serviceName: 'opbeans-java' },
        query: {
          ...range,
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          startIndex,
          endIndex,
          transactionType: 'request',
        },
      });
      expectParseSuccess(route.params!.safeParse(params(0, 10)));
      expectParseError(route.params!.safeParse(params(0, 1_000_000)));
      expectParseError(route.params!.safeParse(params(-1, 10)));
    });
  });
});
