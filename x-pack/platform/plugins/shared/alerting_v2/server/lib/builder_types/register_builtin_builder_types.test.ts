/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { THRESHOLD_BUILDER_TYPE } from '@kbn/alerting-v2-rule-builders';
import { BuilderTypeRegistry } from './builder_type_registry';
import { registerBuiltinBuilderTypes } from './register_builtin_builder_types';

describe('registerBuiltinBuilderTypes', () => {
  let registry: BuilderTypeRegistry;

  beforeEach(() => {
    registry = new BuilderTypeRegistry();
    registerBuiltinBuilderTypes(registry);
  });

  it('registers the threshold builder', () => {
    expect(registry.has(THRESHOLD_BUILDER_TYPE)).toBe(true);
  });

  // The built-in schemas go through the same bounded-schema gate as third-party
  // ones, so registering them here proves they satisfy it.
  it('registers every built-in type without tripping the bounded-schema check', () => {
    expect(registry.getAll().map(({ type }) => type)).toEqual([THRESHOLD_BUILDER_TYPE]);
  });

  it('generates a query from valid threshold fields', () => {
    const generated = registry.generate(THRESHOLD_BUILDER_TYPE, {
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      stats: [{ label: 'count', aggregation: 'count' }],
      evaluations: [],
      alertConditions: [{ metric: 'count', comparator: '>', threshold: [100] }],
      conditionOperator: 'AND',
      groupByFields: [],
    });

    expect(generated).toEqual({
      query: {
        format: 'composed',
        base: 'FROM logs-*\n  | STATS count = COUNT(*)',
        breach: { segment: '| WHERE count > 100.0' },
      },
      time_field: '@timestamp',
    });
  });

  it('rejects threshold fields that fail the registered schema', () => {
    expect(() => registry.generate(THRESHOLD_BUILDER_TYPE, { indexPattern: 'logs-*' })).toThrow(
      /builder_fields for builder type "threshold" are invalid/
    );
  });
});
