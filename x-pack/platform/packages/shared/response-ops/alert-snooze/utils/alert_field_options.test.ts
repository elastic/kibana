/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
import { toLeafScalarFieldOptions } from './alert_field_options';

const field = (overrides: Partial<FieldDescriptor> & { name: string }): FieldDescriptor => ({
  aggregatable: true,
  readFromDocValues: true,
  searchable: true,
  type: 'keyword',
  esTypes: ['keyword'],
  ...overrides,
});

describe('toLeafScalarFieldOptions', () => {
  it('maps scalar leaf fields to { label, value } options', () => {
    const options = toLeafScalarFieldOptions([
      field({ name: 'kibana.alert.status', type: 'keyword' }),
      field({ name: 'kibana.alert.start', type: 'date' }),
    ]);

    expect(options).toEqual([
      { label: 'kibana.alert.start', value: 'kibana.alert.start' },
      { label: 'kibana.alert.status', value: 'kibana.alert.status' },
    ]);
  });

  it('excludes object and nested container fields', () => {
    const options = toLeafScalarFieldOptions([
      field({ name: 'kibana.alert.rule.parameters', type: 'object' }),
      field({ name: 'kibana.alert.rule.threshold', type: 'nested' }),
      field({ name: 'kibana.alert.status', type: 'keyword' }),
    ]);

    expect(options).toEqual([{ label: 'kibana.alert.status', value: 'kibana.alert.status' }]);
  });

  it('excludes leaves inside nested objects', () => {
    const options = toLeafScalarFieldOptions([
      field({
        name: 'kibana.alert.rule.threshold.value',
        type: 'long',
        subType: { nested: { path: 'kibana.alert.rule.threshold' } },
      }),
      field({ name: 'kibana.alert.status', type: 'keyword' }),
    ]);

    expect(options).toEqual([{ label: 'kibana.alert.status', value: 'kibana.alert.status' }]);
  });

  it('de-duplicates fields by name', () => {
    const options = toLeafScalarFieldOptions([
      field({ name: 'host.name', type: 'keyword' }),
      field({ name: 'host.name', type: 'keyword' }),
    ]);

    expect(options).toEqual([{ label: 'host.name', value: 'host.name' }]);
  });

  it('sorts options alphabetically', () => {
    const options = toLeafScalarFieldOptions([
      field({ name: 'zeta' }),
      field({ name: 'alpha' }),
      field({ name: 'mu' }),
    ]);

    expect(options.map((o) => o.value)).toEqual(['alpha', 'mu', 'zeta']);
  });

  it('ignores fields without a name', () => {
    const options = toLeafScalarFieldOptions([
      field({ name: '' }),
      field({ name: 'host.name', type: 'keyword' }),
    ]);

    expect(options).toEqual([{ label: 'host.name', value: 'host.name' }]);
  });
});
