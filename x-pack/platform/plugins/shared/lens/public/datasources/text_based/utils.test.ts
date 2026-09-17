/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { mockDataViewsService } from '../../data_views_service/mocks';
import {
  loadIndexPatternRefs,
  getAllColumns,
  canColumnBeUsedBeInMetricDimension,
  reconcileQueryColumns,
  hasNumericColumn,
  resolveTextBasedColumnType,
  MAX_NUM_OF_COLUMNS,
} from './utils';
import type { TextBasedLayerColumn } from '@kbn/lens-common';

describe('Text based languages utils', () => {
  describe('loadIndexPatternRefs', () => {
    it('should return a list of sorted indexpattern refs', async () => {
      const refs = await loadIndexPatternRefs(mockDataViewsService() as DataViewsPublicPluginStart);
      expect(refs[0].title < refs[1].title).toBeTruthy();
    });
  });

  describe('reconcileQueryColumns', () => {
    it('preserves configured column IDs when compatible query fields change', () => {
      const existingColumns: TextBasedLayerColumn[] = [
        {
          columnId: 'x-axis',
          fieldName: '@timestamp',
          meta: { type: 'date' },
        },
        {
          columnId: 'y-axis',
          fieldName: 'COUNT(*)',
          label: 'Count of records',
          customLabel: true,
          meta: { type: 'number' },
        },
      ];
      const queryColumns: DatatableColumn[] = [
        { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
        { id: 'MAX(bytes)', name: 'MAX(bytes)', meta: { type: 'number' } },
      ];

      expect(reconcileQueryColumns(existingColumns, queryColumns)).toEqual([
        {
          columnId: 'x-axis',
          fieldName: '@timestamp',
          label: '@timestamp',
          meta: { type: 'date' },
        },
        {
          columnId: 'y-axis',
          fieldName: 'MAX(bytes)',
          label: 'Count of records',
          customLabel: true,
          meta: { type: 'number' },
        },
      ]);
    });

    it('rebinds same-type dimensions positionally when the query renames and reorders them', () => {
      const existingColumns: TextBasedLayerColumn[] = [
        { columnId: 'metric-a', fieldName: 'COUNT(*)', meta: { type: 'number' } },
        { columnId: 'metric-b', fieldName: 'MEDIAN(bytes)', meta: { type: 'number' } },
      ];
      const queryColumns: DatatableColumn[] = [
        { id: 'AVG(bytes)', name: 'AVG(bytes)', meta: { type: 'number' } },
        { id: 'SUM(bytes)', name: 'SUM(bytes)', meta: { type: 'number' } },
      ];

      // no exact match: positional matching keeps existing dimension order
      expect(reconcileQueryColumns(existingColumns, queryColumns)).toEqual([
        {
          columnId: 'metric-a',
          fieldName: 'AVG(bytes)',
          label: 'AVG(bytes)',
          meta: { type: 'number' },
        },
        {
          columnId: 'metric-b',
          fieldName: 'SUM(bytes)',
          label: 'SUM(bytes)',
          meta: { type: 'number' },
        },
      ]);
    });

    it('falls back to the first remaining same-type dimension when positional match is incompatible', () => {
      const existingColumns: TextBasedLayerColumn[] = [
        { columnId: 'metric-a', fieldName: 'COUNT(*)', meta: { type: 'number' } },
        { columnId: 'metric-b', fieldName: 'MEDIAN(bytes)', meta: { type: 'number' } },
      ];
      const queryColumns: DatatableColumn[] = [
        { id: 'message', name: 'message', meta: { type: 'string' } },
        { id: 'MEDIAN(bytes)', name: 'MEDIAN(bytes)', meta: { type: 'number' } },
        { id: 'AVG(bytes)', name: 'AVG(bytes)', meta: { type: 'number' } },
      ];

      // exact match wins for MEDIAN(bytes); the renamed metric binds to the
      // first remaining same-type dimension (best-effort, may be ambiguous)
      expect(reconcileQueryColumns(existingColumns, queryColumns)).toEqual([
        {
          columnId: 'message',
          fieldName: 'message',
          label: 'message',
          meta: { type: 'string' },
        },
        {
          columnId: 'metric-b',
          fieldName: 'MEDIAN(bytes)',
          label: 'MEDIAN(bytes)',
          meta: { type: 'number' },
        },
        {
          columnId: 'metric-a',
          fieldName: 'AVG(bytes)',
          label: 'AVG(bytes)',
          meta: { type: 'number' },
        },
      ]);
    });

    it('uses query column IDs for new incompatible fields', () => {
      const existingColumns: TextBasedLayerColumn[] = [
        { columnId: 'metric', fieldName: 'COUNT(*)', meta: { type: 'number' } },
      ];
      const queryColumns: DatatableColumn[] = [
        { id: 'message', name: 'message', meta: { type: 'string' } },
      ];

      expect(reconcileQueryColumns(existingColumns, queryColumns)).toEqual([
        {
          columnId: 'message',
          fieldName: 'message',
          label: 'message',
          meta: { type: 'string' },
        },
      ]);
    });

    // Regression test: when two existing columns share the same fieldName (an
    // orphan from a previous reconcile plus a dimension-bound column), the
    // dimension-bound column must win the exact-match tie so configured
    // dimensions survive the query edit.
    it('prefers dimension-bound columns over orphan duplicates with the same fieldName', () => {
      const bucketField = 'BUCKET(@timestamp, 50, ?_tstart, ?_tend)';
      const existingColumns: TextBasedLayerColumn[] = [
        // orphan: columnId === query column id, not referenced by any dimension
        { columnId: bucketField, fieldName: bucketField, meta: { type: 'date' } },
        // dimension-bound column for the same field
        { columnId: 'col-bucket', fieldName: bucketField, meta: { type: 'date' } },
      ];
      const queryColumns: DatatableColumn[] = [
        { id: bucketField, name: bucketField, meta: { type: 'date' } },
      ];

      expect(reconcileQueryColumns(existingColumns, queryColumns, new Set(['col-bucket']))).toEqual(
        [
          {
            columnId: 'col-bucket',
            fieldName: bucketField,
            label: bucketField,
            meta: { type: 'date' },
          },
        ]
      );
    });

    it('does not let a positional orphan shadow a dimension-bound column of the same type', () => {
      // shape of a duplicated ES|QL layer: orphan copies of the query columns come
      // first, dimension-bound columns last; the query is then changed to COUNT
      const existingColumns: TextBasedLayerColumn[] = [
        { columnId: 'MAX(bytes)', fieldName: 'MAX(bytes)', meta: { type: 'number' } },
        { columnId: '@timestamp', fieldName: '@timestamp', meta: { type: 'date' } },
        { columnId: 'gen-x', fieldName: '@timestamp', meta: { type: 'date' } },
        { columnId: 'gen-y', fieldName: 'MAX(bytes)', meta: { type: 'number' } },
      ];
      const queryColumns: DatatableColumn[] = [
        { id: 'COUNT(*)', name: 'COUNT(*)', meta: { type: 'number' } },
        { id: '@timestamp', name: '@timestamp', meta: { type: 'date' } },
      ];

      const result = reconcileQueryColumns(
        existingColumns,
        queryColumns,
        new Set(['gen-x', 'gen-y'])
      );

      expect(result.map(({ columnId }) => columnId)).toEqual(['gen-y', 'gen-x']);
    });
  });

  describe('getAllColumns', () => {
    it('should remove columns that do not exist on the query and remove duplicates', async () => {
      const existingOnLayer = [
        {
          fieldName: 'time',
          columnId: 'time',
          meta: {
            type: 'date',
          },
        },
        {
          fieldName: 'bytes',
          columnId: 'bytes',
          meta: {
            type: 'number',
          },
        },
      ] as TextBasedLayerColumn[];
      const columnsFromQuery = [
        {
          name: 'timestamp',
          id: 'timestamp',
          meta: {
            type: 'date',
          },
        },
        {
          name: 'bytes',
          id: 'bytes',
          meta: {
            type: 'number',
          },
        },
        {
          name: 'memory',
          id: 'memory',
          meta: {
            type: 'number',
          },
        },
      ] as DatatableColumn[];
      const allColumns = getAllColumns(existingOnLayer, columnsFromQuery);
      expect(allColumns).toStrictEqual([
        {
          fieldName: 'bytes',
          columnId: 'bytes',
          meta: {
            type: 'number',
          },
        },
        {
          fieldName: 'timestamp',
          columnId: 'timestamp',
          label: 'timestamp',
          meta: {
            type: 'date',
          },
        },
        {
          fieldName: 'memory',
          columnId: 'memory',
          label: 'memory',
          meta: {
            type: 'number',
          },
        },
      ]);
    });

    it('should maintain the variable info if it exists', async () => {
      const existingOnLayer = [
        {
          fieldName: 'time',
          columnId: 'time',
          meta: {
            type: 'date',
          },
        },
        {
          fieldName: 'bytes',
          columnId: 'bytes',
          meta: {
            type: 'number',
          },
        },
      ] as TextBasedLayerColumn[];
      const columnsFromQuery = [
        {
          name: 'timestamp',
          id: 'timestamp',
          meta: {
            type: 'date',
          },
        },
        {
          name: 'bytes',
          id: 'bytes',
          meta: {
            type: 'number',
          },
        },
        {
          name: 'memory',
          id: 'memory',
          meta: {
            type: 'number',
          },
          variable: 'field1',
        },
      ] as DatatableColumn[];
      const allColumns = getAllColumns(existingOnLayer, columnsFromQuery);
      expect(allColumns).toStrictEqual([
        {
          fieldName: 'bytes',
          columnId: 'bytes',
          meta: {
            type: 'number',
          },
        },
        {
          fieldName: 'timestamp',
          columnId: 'timestamp',
          label: 'timestamp',
          meta: {
            type: 'date',
          },
        },
        {
          fieldName: 'memory',
          columnId: 'memory',
          label: 'memory',
          meta: {
            type: 'number',
          },
          variable: 'field1',
        },
      ]);
    });
  });

  describe('canColumnBeUsedBeInMetricDimension', () => {
    it('should return true if there are no numeric columns', async () => {
      const flag = canColumnBeUsedBeInMetricDimension(false, 2, 'string');
      expect(flag).toBeTruthy();
    });

    it('should return true if there are numeric columns and the selected type is number', async () => {
      const flag = canColumnBeUsedBeInMetricDimension(true, 2, 'number');
      expect(flag).toBeTruthy();
    });

    it('should return false if there are numeric columns and the selected type is non numeric', async () => {
      const flag = canColumnBeUsedBeInMetricDimension(true, 2, 'date');
      expect(flag).toBeFalsy();
    });

    it('should return true if there are many columns regardless of the types', async () => {
      const flag = canColumnBeUsedBeInMetricDimension(true, MAX_NUM_OF_COLUMNS, 'date');
      expect(flag).toBeTruthy();
    });
  });

  describe('resolveTextBasedColumnType', () => {
    const column = {
      columnId: 'col-uuid',
      fieldName: '@timestamp',
      meta: { type: 'string' },
    } satisfies TextBasedLayerColumn;

    it('prefers activeData column type', () => {
      expect(
        resolveTextBasedColumnType(column, {
          id: 'col-uuid',
          name: '@timestamp',
          meta: { type: 'date' },
        })
      ).toEqual('date');
    });

    it('falls back to persisted meta.type', () => {
      expect(resolveTextBasedColumnType(column)).toEqual('string');
    });
  });

  describe('hasNumericColumn', () => {
    const columns = [
      { columnId: 'a', fieldName: 'bytes', meta: { type: 'string' } },
      { columnId: 'b', fieldName: 'name', meta: { type: 'string' } },
    ] satisfies TextBasedLayerColumn[];

    it('detects a numeric column from the activeData overlay even if persisted meta is not numeric', () => {
      const activeColumns = [
        { id: 'a', name: 'bytes', meta: { type: 'number' } },
      ] as DatatableColumn[];
      expect(hasNumericColumn(columns, activeColumns)).toBe(true);
    });

    it('falls back to persisted meta.type when no activeData is present', () => {
      expect(hasNumericColumn(columns)).toBe(false);
    });

    it('does not treat a persisted number as numeric when the overlay says otherwise', () => {
      const persistedNumber = [
        { columnId: 'a', fieldName: 'ts', meta: { type: 'number' } },
      ] satisfies TextBasedLayerColumn[];
      const activeColumns = [{ id: 'a', name: 'ts', meta: { type: 'date' } }] as DatatableColumn[];
      expect(hasNumericColumn(persistedNumber, activeColumns)).toBe(false);
    });
  });
});
