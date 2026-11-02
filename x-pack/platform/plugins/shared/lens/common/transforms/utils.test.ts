/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiConfig } from '@kbn/lens-embeddable-utils';
import type {
  LensByValueFlattenedSerializedAPIConfig,
  LensByValueSerializedAPIConfig,
} from '@kbn/lens-common-2';

import { flattenAPIConfig, isFlattenedAPIConfig, unflattenAPIConfig } from './utils';

describe('isFlattenedAPIConfig', () => {
  it('returns true for a flattened config with a type discriminant', () => {
    expect(
      isFlattenedAPIConfig({
        type: 'metric',
        metrics: [
          { type: 'primary', operation: 'count', label: 'Count of records', empty_as_null: true },
        ],
        data_source: { type: 'data_view_reference', ref_id: '123' },
        ignore_global_filters: false,
        sampling: 1,
      })
    ).toBe(true);
  });

  it('returns false for a by-ref config (no type, no attributes)', () => {
    expect(isFlattenedAPIConfig({ ref_id: '123' })).toBe(false);
  });

  it('returns false for a nested config with attributes', () => {
    expect(
      isFlattenedAPIConfig({
        attributes: {
          visualizationType: 'xy',
          title: 'Panel',
          references: [],
          state: {
            datasourceStates: {},
            visualization: {},
            query: { query: '', language: 'kuery' },
            filters: [],
          },
        },
      })
    ).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isFlattenedAPIConfig({})).toBe(false);
  });
});

describe('flattenAPIConfig / unflattenAPIConfig', () => {
  it('round-trips panel metadata and API chart fields', () => {
    const chartFields = { type: 'xy' } as LensApiConfig;
    const nested = {
      title: 'Panel',
      attributes: chartFields,
    } satisfies LensByValueSerializedAPIConfig;

    const flat = flattenAPIConfig(nested);

    expect(isFlattenedAPIConfig(flat)).toBe(true);
    expect('attributes' in flat).toBe(false);
    expect('type' in flat && flat.type).toBe('xy');
    expect(flat.title).toBe('Panel');

    const back = unflattenAPIConfig(flat as LensByValueFlattenedSerializedAPIConfig);
    expect(back.title).toBe('Panel');
    expect(back.attributes).toEqual(chartFields);
  });

  it('panel-level title and description take precedence over chart-level ones', () => {
    const chartFields = {
      type: 'xy',
      title: 'Chart Title',
      description: 'Chart Desc',
    } as LensApiConfig;
    const nested = {
      title: 'Panel Title',
      description: 'Panel Desc',
      attributes: chartFields,
    } satisfies LensByValueSerializedAPIConfig;

    const flat = flattenAPIConfig(nested);

    expect(isFlattenedAPIConfig(flat)).toBe(true);
    expect(flat.title).toBe('Panel Title');
    expect(flat.description).toBe('Panel Desc');
    expect('type' in flat && flat.type).toBe('xy');
  });

  it('strips chart-level title/description even when no panel-level ones are set', () => {
    const chartFields = {
      type: 'metric',
      title: 'Chart Title',
      description: 'Chart Desc',
    } as LensApiConfig;
    const nested = {
      attributes: chartFields,
    } satisfies LensByValueSerializedAPIConfig;

    const flat = flattenAPIConfig(nested);

    expect(isFlattenedAPIConfig(flat)).toBe(true);
    expect(flat.title).toBeUndefined();
    expect(flat.description).toBeUndefined();
    expect('type' in flat && flat.type).toBe('metric');
  });

  it('passes through by-ref configs unchanged', () => {
    const byRef = { ref_id: '123' };
    const result = flattenAPIConfig(byRef);
    expect(result).toBe(byRef);
  });
});
