/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';

import type { MultiColumnSorter } from './common';
import { getDataGridSchemaFromKibanaFieldType, multiColumnSortFactory } from './common';

const data = [
  { s: 'a', n: 1 },
  { s: 'a', n: 2 },
  { s: 'b', n: 3 },
  { s: 'b', n: 4 },
];

describe('Data Grid Common', () => {
  describe('multiColumnSortFactory', () => {
    it('returns desc sorted by one column', () => {
      const sortingColumns1: MultiColumnSorter[] = [{ id: 's', direction: 'desc', type: 'number' }];
      const multiColumnSort1 = multiColumnSortFactory(sortingColumns1);
      data.sort(multiColumnSort1);

      expect(data).toStrictEqual([
        { s: 'b', n: 3 },
        { s: 'b', n: 4 },
        { s: 'a', n: 1 },
        { s: 'a', n: 2 },
      ]);
    });

    it('returns asc/desc sorted by two columns', () => {
      const sortingColumns2: MultiColumnSorter[] = [
        { id: 's', direction: 'asc', type: 'number' },
        { id: 'n', direction: 'desc', type: 'number' },
      ];
      const multiColumnSort2 = multiColumnSortFactory(sortingColumns2);
      data.sort(multiColumnSort2);

      expect(data).toStrictEqual([
        { s: 'a', n: 2 },
        { s: 'a', n: 1 },
        { s: 'b', n: 4 },
        { s: 'b', n: 3 },
      ]);
    });

    it('returns desc/desc sorted by two column', () => {
      const sortingColumns3: MultiColumnSorter[] = [
        { id: 'n', direction: 'desc', type: 'number' },
        { id: 's', direction: 'desc', type: 'number' },
      ];
      const multiColumnSort3 = multiColumnSortFactory(sortingColumns3);
      data.sort(multiColumnSort3);

      expect(data).toStrictEqual([
        { s: 'b', n: 4 },
        { s: 'b', n: 3 },
        { s: 'a', n: 2 },
        { s: 'a', n: 1 },
      ]);
    });
  });

  describe('getDataGridSchemaFromKibanaFieldType', () => {
    it('returns undefined for an undefined field', () => {
      expect(getDataGridSchemaFromKibanaFieldType(undefined)).toBe(undefined);
    });

    it(`returns 'boolean' for a 'boolean' kibana field`, () => {
      expect(
        getDataGridSchemaFromKibanaFieldType({
          type: 'boolean',
        } as DataViewField)
      ).toBe('boolean');
    });

    it(`returns 'datetime' for a 'date' kibana field`, () => {
      expect(
        getDataGridSchemaFromKibanaFieldType({
          type: 'date',
        } as DataViewField)
      ).toBe('datetime');
    });

    it(`returns 'json' for a 'geo_point' kibana field`, () => {
      expect(
        getDataGridSchemaFromKibanaFieldType({
          type: 'geo_point',
        } as DataViewField)
      ).toBe('json');
    });

    it(`returns 'json' for a 'geo_shape' kibana field`, () => {
      expect(
        getDataGridSchemaFromKibanaFieldType({
          type: 'geo_point',
        } as DataViewField)
      ).toBe('json');
    });

    it(`returns 'numeric' for a 'number' kibana field`, () => {
      expect(
        getDataGridSchemaFromKibanaFieldType({
          type: 'number',
        } as DataViewField)
      ).toBe('numeric');
    });

    it(`returns 'json' for a 'nested' kibana field`, () => {
      expect(
        getDataGridSchemaFromKibanaFieldType({
          type: 'nested',
        } as DataViewField)
      ).toBe('json');
    });

    it(`returns 'non-aggregatable' for a 'number' kibana field with 'aggregate_metric_double' estype field`, () => {
      expect(
        getDataGridSchemaFromKibanaFieldType({
          type: 'number',
          esTypes: ['aggregate_metric_double'],
        } as DataViewField)
      ).toBe('non-aggregatable');
    });

    it(`returns undefined for a 'string' kibana field`, () => {
      expect(
        getDataGridSchemaFromKibanaFieldType({
          type: 'string',
        } as DataViewField)
      ).toBe(undefined);
    });

    it(`returns 'non-aggregatable' for a 'string' kibana field that is not aggregatable`, () => {
      expect(
        getDataGridSchemaFromKibanaFieldType({
          type: 'string',
          aggregatable: false,
        } as DataViewField)
      ).toBe('non-aggregatable');
    });
  });
});
