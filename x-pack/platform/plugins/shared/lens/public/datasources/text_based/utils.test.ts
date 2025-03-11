/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { mockDataViewsService } from '../../data_views_service/mocks';
import {
  getIndexPatternFromTextBasedQuery,
  loadIndexPatternRefs,
  getStateFromAggregateQuery,
  getAllColumns,
  canColumnBeUsedBeInMetricDimension,
} from './utils';
import type { TextBasedLayerColumn } from './types';
import { type AggregateQuery } from '@kbn/es-query';

jest.mock('./fetch_data_from_aggregate_query', () => ({
  fetchDataFromAggregateQuery: jest.fn(() => {
    return {
      columns: [
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
      ],
    };
  }),
}));

describe('Text based languages utils', () => {
  describe('getIndexPatternFromTextBasedQuery', () => {
    it('should return the index pattern for es|ql query', () => {
      const indexPattern = getIndexPatternFromTextBasedQuery({
        esql: 'from foo | keep bytes, memory ',
      });

      expect(indexPattern).toBe('foo');
    });

    it('should return empty index pattern for non es|ql query', () => {
      const indexPattern = getIndexPatternFromTextBasedQuery({
        lang1: 'from foo | keep bytes, memory ',
      } as unknown as AggregateQuery);

      expect(indexPattern).toBe('');
    });
  });

  describe('loadIndexPatternRefs', () => {
    it('should return a list of sorted indexpattern refs', async () => {
      const refs = await loadIndexPatternRefs(mockDataViewsService() as DataViewsPublicPluginStart);
      expect(refs[0].title < refs[1].title).toBeTruthy();
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

  describe('getStateFromAggregateQuery', () => {
    const textBasedQueryColumns = [
      {
        id: 'bytes',
        name: 'bytes',
        meta: {
          type: 'number',
        },
      },
      {
        id: 'dest',
        name: 'dest',
        meta: {
          type: 'string',
        },
      },
    ] as DatatableColumn[];
    it('should return the correct state', async () => {
      const state = {
        layers: {
          first: {
            columns: [],
            query: undefined,
            index: '',
          },
        },
        indexPatternRefs: [],
        initialContext: {
          textBasedColumns: textBasedQueryColumns,
          query: { esql: 'from foo' },
          fieldName: '',
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
      };
      const dataViewsMock = dataViewPluginMocks.createStartContract();
      const dataMock = dataPluginMock.createStartContract();
      const expressionsMock = expressionsPluginMock.createStartContract();
      const updatedState = await getStateFromAggregateQuery(
        state,
        { esql: 'FROM my-fake-index-pattern' },
        {
          ...dataViewsMock,
          getIdsWithTitle: jest.fn().mockReturnValue(
            Promise.resolve([
              { id: '1', title: 'my-fake-index-pattern' },
              { id: '2', title: 'my-fake-restricted-pattern' },
              { id: '3', title: 'my-compatible-pattern' },
            ])
          ),
          get: jest.fn().mockReturnValue(
            Promise.resolve({
              id: '1',
              title: 'my-fake-index-pattern',
              timeFieldName: 'timeField',
            })
          ),
          create: jest.fn().mockReturnValue(
            Promise.resolve({
              id: '4',
              title: 'my-adhoc-index-pattern',
              name: 'my-adhoc-index-pattern',
              timeFieldName: 'timeField',
              isPersisted: () => false,
            })
          ),
        },
        dataMock,
        expressionsMock
      );

      expect(updatedState).toStrictEqual({
        initialContext: {
          textBasedColumns: textBasedQueryColumns,
          query: { esql: 'from foo' },
          fieldName: '',
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
        indexPatternRefs: [
          {
            id: '3',
            timeField: 'timeField',
            title: 'my-compatible-pattern',
          },
          {
            id: '1',
            timeField: 'timeField',
            title: 'my-fake-index-pattern',
          },
          {
            id: '2',
            timeField: 'timeField',
            title: 'my-fake-restricted-pattern',
          },
          {
            id: '4',
            timeField: undefined,
            title: 'my-adhoc-index-pattern',
          },
        ],
        layers: {
          first: {
            columns: [],
            errors: [],
            index: '4',
            query: {
              esql: 'FROM my-fake-index-pattern',
            },
            timeField: undefined,
          },
        },
      });
    });

    it('should return the correct state for query with named params', async () => {
      const state = {
        layers: {
          first: {
            columns: [],
            query: undefined,
            index: '',
          },
        },
        indexPatternRefs: [],
        initialContext: {
          textBasedColumns: textBasedQueryColumns,
          query: { esql: 'from foo' },
          fieldName: '',
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
      };
      const dataViewsMock = dataViewPluginMocks.createStartContract();
      const dataMock = dataPluginMock.createStartContract();
      const expressionsMock = expressionsPluginMock.createStartContract();
      const updatedState = await getStateFromAggregateQuery(
        state,
        { esql: 'FROM my-fake-index-pattern | WHERE time <= ?_tend' },
        {
          ...dataViewsMock,
          getIdsWithTitle: jest.fn().mockReturnValue(
            Promise.resolve([
              { id: '1', title: 'my-fake-index-pattern' },
              { id: '2', title: 'my-fake-restricted-pattern' },
              { id: '3', title: 'my-compatible-pattern' },
            ])
          ),
          get: jest.fn().mockReturnValue(
            Promise.resolve({
              id: '1',
              title: 'my-fake-index-pattern',
              timeFieldName: 'timeField',
            })
          ),
          create: jest.fn().mockReturnValue(
            Promise.resolve({
              id: '4',
              title: 'my-adhoc-index-pattern',
              name: 'my-adhoc-index-pattern',
              timeFieldName: 'timeField',
              isPersisted: () => false,
            })
          ),
        },
        dataMock,
        expressionsMock
      );

      expect(updatedState).toStrictEqual({
        initialContext: {
          textBasedColumns: textBasedQueryColumns,
          query: { esql: 'from foo' },
          fieldName: '',
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
        indexPatternRefs: [
          {
            id: '3',
            timeField: 'timeField',
            title: 'my-compatible-pattern',
          },
          {
            id: '1',
            timeField: 'timeField',
            title: 'my-fake-index-pattern',
          },
          {
            id: '2',
            timeField: 'timeField',
            title: 'my-fake-restricted-pattern',
          },
          {
            id: '4',
            timeField: 'time',
            title: 'my-adhoc-index-pattern',
          },
        ],
        layers: {
          first: {
            columns: [],
            errors: [],
            index: '4',
            query: {
              esql: 'FROM my-fake-index-pattern | WHERE time <= ?_tend',
            },
            timeField: 'time',
          },
        },
      });
    });

    it('should return the correct state for not existing dataview', async () => {
      const state = {
        layers: {
          first: {
            columns: [],
            query: undefined,
            index: '',
          },
        },
        indexPatternRefs: [],
        initialContext: {
          textBasedColumns: textBasedQueryColumns,
          query: { esql: 'from foo' },
          fieldName: '',
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
      };
      const dataViewsMock = dataViewPluginMocks.createStartContract();
      const dataMock = dataPluginMock.createStartContract();
      const expressionsMock = expressionsPluginMock.createStartContract();
      const updatedState = await getStateFromAggregateQuery(
        state,
        { esql: 'FROM my-fake-index-*' },
        {
          ...dataViewsMock,
          getIdsWithTitle: jest.fn().mockReturnValue(
            Promise.resolve([
              { id: '1', title: 'my-fake-index-pattern' },
              { id: '2', title: 'my-fake-restricted-pattern' },
              { id: '3', title: 'my-compatible-pattern' },
            ])
          ),
          get: jest.fn().mockReturnValue(
            Promise.resolve({
              id: '1',
              title: 'my-fake-index-pattern',
              timeFieldName: 'timeField',
            })
          ),
          create: jest.fn().mockReturnValue(
            Promise.resolve({
              id: 'adHoc-id',
              title: 'my-fake-index-*',
              name: 'my-fake-index-*',
              timeFieldName: 'timeField',
              isPersisted: () => false,
              fields: {
                getByName: jest.fn().mockReturnValue({
                  type: 'date',
                }),
              },
            })
          ),
        },
        dataMock,
        expressionsMock
      );

      expect(updatedState).toStrictEqual({
        initialContext: {
          textBasedColumns: textBasedQueryColumns,
          query: { esql: 'from foo' },
          fieldName: '',
          dataViewSpec: {
            title: 'foo',
            id: '1',
            name: 'Foo',
          },
        },
        indexPatternRefs: [
          {
            id: '3',
            timeField: 'timeField',
            title: 'my-compatible-pattern',
          },
          {
            id: '1',
            timeField: 'timeField',
            title: 'my-fake-index-pattern',
          },
          {
            id: '2',
            timeField: 'timeField',
            title: 'my-fake-restricted-pattern',
          },
          {
            id: 'adHoc-id',
            timeField: '@timestamp',
            title: 'my-fake-index-*',
          },
        ],
        layers: {
          first: {
            columns: [],
            errors: [],
            index: 'adHoc-id',
            query: {
              esql: 'FROM my-fake-index-*',
            },
            timeField: '@timestamp',
          },
        },
      });
    });
  });

  describe('canColumnBeUsedBeInMetricDimension', () => {
    it('should return true if there are non numeric field', async () => {
      const fieldList = [
        {
          id: 'a',
          name: 'Test 1',
          meta: {
            type: 'string',
          },
        },
        {
          id: 'b',
          name: 'Test 2',
          meta: {
            type: 'string',
          },
        },
      ] as DatatableColumn[];
      const flag = canColumnBeUsedBeInMetricDimension(fieldList, 'string');
      expect(flag).toBeTruthy();
    });

    it('should return true if there are numeric field and the selected type is number', async () => {
      const fieldList = [
        {
          id: 'a',
          name: 'Test 1',
          meta: {
            type: 'number',
          },
        },
        {
          id: 'b',
          name: 'Test 2',
          meta: {
            type: 'string',
          },
        },
      ] as DatatableColumn[];
      const flag = canColumnBeUsedBeInMetricDimension(fieldList, 'number');
      expect(flag).toBeTruthy();
    });

    it('should return false if there are non numeric fields and the selected type is non numeric', async () => {
      const fieldList = [
        {
          id: 'a',
          name: 'Test 1',
          meta: {
            type: 'number',
          },
        },
        {
          id: 'b',
          name: 'Test 2',
          meta: {
            type: 'string',
          },
        },
      ] as DatatableColumn[];
      const flag = canColumnBeUsedBeInMetricDimension(fieldList, 'date');
      expect(flag).toBeFalsy();
    });

    it('should return true if there are many columns regardless the types', async () => {
      const fieldList = [
        {
          id: 'a',
          name: 'Test 1',
          meta: {
            type: 'number',
          },
        },
        {
          id: 'b',
          name: 'Test 2',
          meta: {
            type: 'number',
          },
        },
        {
          id: 'c',
          name: 'Test 3',
          meta: {
            type: 'date',
          },
        },
        {
          id: 'd',
          name: 'Test 4',
          meta: {
            type: 'string',
          },
        },
        {
          id: 'e',
          name: 'Test 5',
          meta: {
            type: 'string',
          },
        },
      ] as DatatableColumn[];
      const flag = canColumnBeUsedBeInMetricDimension(fieldList, 'date');
      expect(flag).toBeTruthy();
    });
  });
});
