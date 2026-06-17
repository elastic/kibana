/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsResourceType } from '@kbn/agent-builder-common';
import { formatResourceWithSampledValues } from './format_resource_with_sampling';
import type { MappingFieldWithStats } from '../sampling';
import type { ResolvedResourceWithSampling } from './resolve_resource_for_esql_with_sampling_stats';

const field = (overrides: Partial<MappingFieldWithStats>): MappingFieldWithStats => ({
  path: 'f',
  type: 'keyword',
  meta: {},
  searchable: true,
  stats: { filledDocCount: 0, emptyDocCount: 0, values: [] },
  ...overrides,
});

const buildResource = (
  fields: MappingFieldWithStats[],
  isTsdb: boolean
): ResolvedResourceWithSampling => ({
  name: 'metrics',
  type: EsResourceType.dataStream,
  fields,
  isTsdb,
});

describe('formatResourceWithSampledValues', () => {
  it('omits is-tsdb attribute when the resource is not TSDB', () => {
    const out = formatResourceWithSampledValues({
      resource: buildResource([field({ path: 'message', type: 'text' })], false),
    });

    expect(out.split('\n')[0]).toBe('<target_resource name="metrics" type="data_stream">');
  });

  it('emits is-tsds="true" attribute when the resource is TSDB', () => {
    const out = formatResourceWithSampledValues({
      resource: buildResource(
        [field({ path: 'host.name', type: 'keyword', tsDimension: true })],
        true
      ),
    });

    expect(out.split('\n')[0]).toBe(
      '<target_resource name="metrics" type="data_stream" is-tsds="true">'
    );
  });

  it('renders tsDimension inline in the bracket segment', () => {
    const out = formatResourceWithSampledValues({
      resource: buildResource(
        [field({ path: 'host.name', type: 'keyword', tsDimension: true })],
        true
      ),
    });

    expect(out).toContain('- host.name [keyword, ts_dimension]');
  });

  it('renders tsMetric inline in the bracket segment', () => {
    const out = formatResourceWithSampledValues({
      resource: buildResource(
        [field({ path: 'system.cpu.pct', type: 'float', tsMetric: 'gauge' })],
        true
      ),
    });

    expect(out).toContain('- system.cpu.pct [float, ts_metric=gauge]');
  });

  it('renders both markers when present, in the order tsDimension then tsMetric', () => {
    const out = formatResourceWithSampledValues({
      resource: buildResource(
        [
          field({
            path: 'mixed.field',
            type: 'long',
            tsDimension: true,
            tsMetric: 'counter',
          }),
        ],
        true
      ),
    });

    expect(out).toContain('- mixed.field [long, ts_dimension, ts_metric=counter]');
  });

  it('renders a plain bracket when no markers are present', () => {
    const out = formatResourceWithSampledValues({
      resource: buildResource([field({ path: '@timestamp', type: 'date' })], false),
    });

    expect(out).toContain('- @timestamp [date]');
  });
});
