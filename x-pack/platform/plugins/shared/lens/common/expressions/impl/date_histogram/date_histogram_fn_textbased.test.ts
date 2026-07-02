/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import { createDatatableUtilitiesMock } from '@kbn/data-plugin/common/mocks';
import { getDateHistogramTextBased } from '../../defs/date_histogram';

const dateHistogram = getDateHistogramTextBased(createDatatableUtilitiesMock, () => 'UTC');

const buildBucketColumn = (
  params: Record<string, string | boolean>,
  appliedTimeRange?: { from: string; to: string }
): Datatable['columns'][number] => ({
  id: 'a',
  name: 'A',
  meta: {
    type: 'date',
    sourceParams: {
      params,
      ...(appliedTimeRange ? { appliedTimeRange } : {}),
    },
  },
});

describe('lens_date_histogram_textbased', () => {
  describe('drop partials', () => {
    it('drops leading and trailing partial buckets for numeric date values', async () => {
      const input: Datatable = {
        type: 'datatable',
        columns: [
          buildBucketColumn(
            { used_interval: '1s', used_time_zone: 'UTC', drop_partials: true },
            { from: '1970-01-01T00:00:01.000Z', to: '1970-01-01T00:00:04.000Z' }
          ),
          { id: 'b', name: 'B', meta: { type: 'number' } },
        ],
        rows: [
          { a: 0, b: 1 },
          { a: 1000, b: 2 },
          { a: 2000, b: 3 },
          { a: 3000, b: 4 },
          { a: 4000, b: 5 },
        ],
      };

      const result = await dateHistogram.fn(input, {}, createMockExecutionContext());

      expect(result.rows).toStrictEqual([
        { a: 1000, b: 2 },
        { a: 2000, b: 3 },
        { a: 3000, b: 4 },
      ]);
    });

    it('drops the trailing partial bucket', async () => {
      const input: Datatable = {
        type: 'datatable',
        columns: [
          buildBucketColumn(
            { used_interval: '1h', used_time_zone: 'Europe/London', drop_partials: true },
            { from: '2026-06-29T00:00:00.000Z', to: '2026-06-29T02:30:00.000Z' }
          ),
          { id: 'b', name: 'B', meta: { type: 'number' } },
        ],
        rows: [
          { a: '2026-06-29T00:00:00.000Z', b: 1 },
          { a: '2026-06-29T01:00:00.000Z', b: 2 },
          { a: '2026-06-29T02:00:00.000Z', b: 3 },
        ],
      };

      const result = await dateHistogram.fn(input, {}, createMockExecutionContext());

      expect(result.rows).toStrictEqual([
        { a: '2026-06-29T00:00:00.000Z', b: 1 },
        { a: '2026-06-29T01:00:00.000Z', b: 2 },
      ]);
    });

    it('keeps all buckets when drop_partials is disabled', async () => {
      const input: Datatable = {
        type: 'datatable',
        columns: [
          buildBucketColumn(
            { used_interval: '1s', used_time_zone: 'UTC', drop_partials: false },
            { from: '1970-01-01T00:00:01.000Z', to: '1970-01-01T00:00:04.000Z' }
          ),
          { id: 'b', name: 'B', meta: { type: 'number' } },
        ],
        rows: [
          { a: 0, b: 1 },
          { a: 1000, b: 2 },
          { a: 4000, b: 5 },
        ],
      };

      const result = await dateHistogram.fn(input, {}, createMockExecutionContext());

      expect(result.rows).toStrictEqual([
        { a: 0, b: 1 },
        { a: 1000, b: 2 },
        { a: 4000, b: 5 },
      ]);
    });
  });

  describe('computed domain', () => {
    it('annotates the bucket column with the domain', async () => {
      const input: Datatable = {
        type: 'datatable',
        columns: [
          buildBucketColumn(
            { used_interval: '1s', used_time_zone: 'UTC', drop_partials: false },
            { from: '1970-01-01T00:00:00.000Z', to: '1970-01-01T00:00:10.000Z' }
          ),
          { id: 'b', name: 'B', meta: { type: 'number' } },
        ],
        rows: [
          { a: 2000, b: 1 },
          { a: 5000, b: 2 },
        ],
      };

      const result = await dateHistogram.fn(input, {}, createMockExecutionContext());

      expect(result.columns[0].meta.sourceParams?.computedDomain).toEqual({
        min: 0,
        max: 10000,
      });

      expect(result.rows.length).toEqual(input.rows.length);
    });
  });

  it('returns the table unchanged when there is no date histogram bucket column', async () => {
    const input: Datatable = {
      type: 'datatable',
      columns: [{ id: 'b', name: 'B', meta: { type: 'number' } }],
      rows: [{ b: 1 }, { b: 2 }],
    };

    const result = await dateHistogram.fn(input, {}, createMockExecutionContext());

    expect(result).toBe(input);
  });
});
