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

const buildBucketColumn = ({
  bucket,
  dropPartials,
  appliedTimeRange,
}: {
  bucket: { interval: number; unit: string };
  dropPartials?: boolean;
  appliedTimeRange?: { from: string; to: string };
}): Datatable['columns'][number] => ({
  id: 'a',
  name: 'A',
  meta: {
    type: 'date',
    esType: 'date',
    esMeta: { bucket },
    sourceParams: {
      // Only materialize drop_partials when explicitly set, so an unset value
      // stays undefined (getDateHistogramMeta returns undefined -> defaults to on).
      ...(dropPartials !== undefined ? { params: { drop_partials: dropPartials } } : {}),
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
          buildBucketColumn({
            bucket: { interval: 1, unit: 'second' },
            dropPartials: true,
            appliedTimeRange: { from: '1970-01-01T00:00:01.000Z', to: '1970-01-01T00:00:04.000Z' },
          }),
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
          buildBucketColumn({
            bucket: { interval: 1, unit: 'hour' },
            dropPartials: true,
            appliedTimeRange: { from: '2026-06-29T00:00:00.000Z', to: '2026-06-29T02:30:00.000Z' },
          }),
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

    it('drops partial buckets by default when drop_partials is unset', async () => {
      const input: Datatable = {
        type: 'datatable',
        columns: [
          buildBucketColumn({
            bucket: { interval: 1, unit: 'second' },
            appliedTimeRange: { from: '1970-01-01T00:00:01.000Z', to: '1970-01-01T00:00:04.000Z' },
          }),
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

    it('keeps all buckets when drop_partials is disabled', async () => {
      const input: Datatable = {
        type: 'datatable',
        columns: [
          buildBucketColumn({
            bucket: { interval: 1, unit: 'second' },
            dropPartials: false,
            appliedTimeRange: { from: '1970-01-01T00:00:01.000Z', to: '1970-01-01T00:00:04.000Z' },
          }),
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
          buildBucketColumn({
            bucket: { interval: 1, unit: 'second' },
            dropPartials: false,
            appliedTimeRange: { from: '1970-01-01T00:00:00.000Z', to: '1970-01-01T00:00:10.000Z' },
          }),
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

    it('computes the domain from the time range when there are no rows', async () => {
      const input: Datatable = {
        type: 'datatable',
        columns: [
          buildBucketColumn({
            bucket: { interval: 1, unit: 'second' },
            dropPartials: false,
            appliedTimeRange: { from: '1970-01-01T00:00:00.000Z', to: '1970-01-01T00:00:10.000Z' },
          }),
          { id: 'b', name: 'B', meta: { type: 'number' } },
        ],
        rows: [],
      };

      const result = await dateHistogram.fn(input, {}, createMockExecutionContext());

      expect(result.columns[0].meta.sourceParams?.computedDomain).toEqual({
        min: 0,
        max: 10000,
      });
    });

    describe('DST', () => {
      const dateHistogramRome = getDateHistogramTextBased(
        createDatatableUtilitiesMock,
        () => 'Europe/Rome'
      );

      // 12h TBUCKET over a Europe/Rome range that includes the 2026-10-25 fallback.
      const appliedTimeRange = {
        from: '2026-10-14T22:00:00.000Z',
        to: '2026-10-28T16:00:00.000Z',
      };
      const bar15 = Date.parse('2026-10-19T12:00:00.000+02:00');
      const bar485 = Date.parse('2026-10-28T00:00:00.000+01:00');
      const bar421 = Date.parse('2026-10-28T12:00:00.000+01:00');
      const expectedDomain = {
        min: Date.parse('2026-10-15T00:00:00.000+02:00'),
        max: bar485,
      };

      const buildInput = (rows: Array<{ a: number; b: number }>): Datatable => ({
        type: 'datatable',
        columns: [
          buildBucketColumn({
            bucket: { interval: 12, unit: 'hour' },
            appliedTimeRange,
          }),
          { id: 'b', name: 'B', meta: { type: 'number' } },
        ],
        rows,
      });

      it('keeps a stable domain across DST regardless of row order', async () => {
        const context = createMockExecutionContext();
        const resultPreDstFirst = await dateHistogramRome.fn(
          buildInput([
            { a: bar15, b: 15 },
            { a: bar485, b: 485 },
            { a: bar421, b: 421 },
          ]),
          {},
          context
        );
        const resultPostDstFirst = await dateHistogramRome.fn(
          buildInput([
            { a: bar485, b: 485 },
            { a: bar15, b: 15 },
            { a: bar421, b: 421 },
          ]),
          {},
          context
        );

        expect(resultPreDstFirst.columns[0].meta.sourceParams?.computedDomain).toEqual(
          expectedDomain
        );
        expect(resultPostDstFirst.columns[0].meta.sourceParams?.computedDomain).toEqual(
          expectedDomain
        );
      });

      it('drops the trailing partial bucket and keeps the last full bucket after DST', async () => {
        const result = await dateHistogramRome.fn(
          buildInput([
            { a: bar15, b: 15 },
            { a: bar485, b: 485 },
            { a: bar421, b: 421 },
          ]),
          {},
          createMockExecutionContext()
        );

        expect(result.rows).toStrictEqual([
          { a: bar15, b: 15 },
          { a: bar485, b: 485 },
        ]);
        expect(result.columns[0].meta.sourceParams?.computedDomain).toEqual(expectedDomain);
      });
    });
  });

  it('returns the table unchanged when the ES|QL date column has no bucket metadata', async () => {
    const input: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: 'a',
          name: 'A',
          meta: {
            type: 'date',
            esType: 'date',
            sourceParams: {
              params: { drop_partials: true },
              appliedTimeRange: {
                from: '1970-01-01T00:00:01.000Z',
                to: '1970-01-01T00:00:04.000Z',
              },
            },
          },
        },
        { id: 'b', name: 'B', meta: { type: 'number' } },
      ],
      rows: [
        { a: 0, b: 1 },
        { a: 1000, b: 2 },
        { a: 4000, b: 5 },
      ],
    };

    const result = await dateHistogram.fn(input, {}, createMockExecutionContext());

    expect(result).toBe(input);
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
