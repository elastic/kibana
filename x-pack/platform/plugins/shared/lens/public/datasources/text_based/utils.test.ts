/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { mockDataViewsService } from '../../data_views_service/mocks';
import { loadIndexPatternRefs, getAllColumns, canColumnBeUsedBeInMetricDimension } from './utils';
import type { TextBasedLayerColumn } from '@kbn/lens-common';

describe('Text based languages utils', () => {
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
        { id: 'a', name: 'Test 1', meta: { type: 'number' } },
        { id: 'b', name: 'Test 2', meta: { type: 'number' } },
        { id: 'c', name: 'Test 3', meta: { type: 'date' } },
        { id: 'd', name: 'Test 4', meta: { type: 'string' } },
        { id: 'e', name: 'Test 5', meta: { type: 'string' } },
        { id: 'f', name: 'Test 6', meta: { type: 'string' } },
        { id: 'g', name: 'Test 7', meta: { type: 'string' } },
        { id: 'h', name: 'Test 8', meta: { type: 'string' } },
        { id: 'i', name: 'Test 9', meta: { type: 'string' } },
        { id: 'j', name: 'Test 10', meta: { type: 'string' } },
      ] as DatatableColumn[];
      const flag = canColumnBeUsedBeInMetricDimension(fieldList, 'date');
      expect(flag).toBeTruthy();
    });
  });
});
