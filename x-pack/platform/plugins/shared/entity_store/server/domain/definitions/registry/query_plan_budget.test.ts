/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_QUERY_PLANS, MAX_SOURCES } from '../../../../common/domain/definitions/dynamic';
import type { DynamicMetric, DynamicSource } from '../../../../common/domain/definitions/dynamic';
import { EntityDefinitionRegistry, type RegistrableEntityDefinition } from '.';
import { loggerMock } from '@kbn/logging-mocks';

const metric = (overrides: Partial<DynamicMetric> = {}): DynamicMetric => ({
  name: 'cpu',
  field: 'cpu',
  agg: 'last',
  ...overrides,
});

const sourcesOf = (metricsOf: (index: number) => DynamicMetric[]): DynamicSource[] =>
  Array.from({ length: MAX_SOURCES }, (_, index) => ({
    indexPattern: `metrics-${index}-*`,
    metrics: metricsOf(index),
  }));

const definitionWith = (sources: DynamicSource[]): RegistrableEntityDefinition => ({
  type: 'k8s.pod',
  name: 'Pod',
  identityField: { singleField: 'k8s.pod.uid' },
  managedBy: { kind: 'plugin', id: 'testPlugin' },
  dynamic: { sources },
});

const register = (sources: DynamicSource[]) =>
  new EntityDefinitionRegistry(loggerMock.create()).register(definitionWith(sources));

describe('query plan budget', () => {
  const sourcesWithFilteredMetric = (count: number): DynamicSource[] =>
    Array.from({ length: count }, (_, index) => ({
      indexPattern: `metrics-${index}-*`,
      metrics: [metric(), metric({ name: 'cpu_idle', filter: 'state == "idle"' })],
    }));

  it(`accepts ${MAX_SOURCES} sources without metrics, ${MAX_QUERY_PLANS} plans`, () => {
    expect(register(sourcesOf(() => []))).toEqual({ ok: true });
  });

  it('accepts a block that can expand to exactly the budget', () => {
    expect(register(sourcesWithFilteredMetric(MAX_QUERY_PLANS / 4))).toEqual({ ok: true });
  });

  it('rejects a block that can expand past the budget, naming the count', () => {
    const result = register(sourcesWithFilteredMetric(MAX_QUERY_PLANS / 4 + 1));

    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining(`can expand to ${MAX_QUERY_PLANS + 4} query plans`),
    });
  });

  it('counts metrics that share a filter as one plan group', () => {
    const sharedFilter = (name: string) => metric({ name, field: name, filter: 'state == "idle"' });

    expect(
      register(sourcesOf(() => [sharedFilter('a'), sharedFilter('b'), sharedFilter('c')]))
    ).toEqual({ ok: true });
  });

  it('counts two spellings of one filter as one plan group', () => {
    const result = register(
      sourcesOf(() => [
        metric({ name: 'a', field: 'a', filter: 'state=="idle"' }),
        metric({ name: 'b', field: 'b', filter: 'state == "idle"' }),
      ])
    );

    expect(result).toEqual({ ok: true });
  });

  it('still counts two different filters as two plan groups', () => {
    const result = register(
      sourcesOf(() => [
        metric({ name: 'a', field: 'a', filter: 'state=="idle"' }),
        metric({ name: 'b', field: 'b', filter: 'state == "user"' }),
      ])
    );

    expect(result.ok).toBe(false);
  });

  it('counts a filter that does not parse as written', () => {
    const result = register(
      sourcesOf(() => [
        metric({ name: 'a', field: 'a', filter: 'state == "idle"' }),
        metric({ name: 'b', field: 'b', filter: 'state ==' }),
      ])
    );

    expect(result.ok).toBe(false);
  });
});
