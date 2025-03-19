/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DropType } from '@kbn/dom-drag-drop';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { onDrop } from './on_drop';
import { column1, column2, column3, emptyDimensionTarget, defaultProps, fieldList } from './mocks';
import { DatasourceDimensionDropHandlerProps } from '../../../types';
import { TextBasedPrivateState } from '../types';
import { addColumnsToCache } from '../fieldlist_cache';

describe('onDrop', () => {
  addColumnsToCache(
    {
      esql: 'FROM "kibana_sample_data_ecommerce"',
    },
    fieldList.map((f) => {
      return {
        id: f.columnId,
        name: f.fieldName,
        meta: f?.meta,
        ...(f.columnId === 'products.base_price' && { variable: 'field' }),
      } as DatatableColumn;
    })
  );
  it('should return false if dropType is not in the list', () => {
    const props = {
      ...defaultProps,
      dropType: 'not_in_the_list' as DropType,
    };
    expect(onDrop(props)).toEqual(undefined);
  });
  it('should swap the dimensions if dropType is swap_compatible', () => {
    const props = {
      ...defaultProps,
      dropType: 'swap_compatible' as DropType,
    };
    const expectedColumns = [
      { ...column3, columnId: 'columnId1' },
      column2,
      { ...column1, columnId: 'columnId3' },
    ];
    expect(onDrop(props)).toEqual(
      expect.objectContaining({
        layers: {
          first: expect.objectContaining({
            columns: expectedColumns,
          }),
        },
      })
    );
  });
  it('should reorder the dimensions if dropType is reorder', () => {
    const props = {
      ...defaultProps,
      dropType: 'reorder' as DropType,
    };
    const expectedColumns = [column2, column3, column1];
    expect(onDrop(props)).toEqual(
      expect.objectContaining({
        layers: {
          first: expect.objectContaining({
            columns: expectedColumns,
          }),
        },
      })
    );
  });
  it('should move the dimension if dropType is move_compatible and remove the original one', () => {
    const props = {
      ...defaultProps,
      target: emptyDimensionTarget,
      dropType: 'move_compatible' as DropType,
    };
    const expectedColumns = [column2, column3, { ...column1, columnId: 'newId' }];
    expect(onDrop(props)).toEqual(
      expect.objectContaining({
        layers: {
          first: expect.objectContaining({
            columns: expectedColumns,
          }),
        },
      })
    );
  });
  it('should add the column when dropping a field', () => {
    const props = {
      ...defaultProps,
      source: {
        field: 'currency',
        id: 'currency',
        humanData: {
          label: 'currency',
        },
      },
      target: {
        layerId: 'first',
        groupId: 'x',
        isNewColumn: true,
        indexPatternId: '9de9a3c2-ae98-4180-b019-4d208e516b70',
        humanData: {
          groupLabel: 'Vertical axis',
          layerNumber: 1,
          position: 1,
          label: 'Empty dimension',
          nextLabel: 'currency',
          canDuplicate: false,
        },
        columnId: 'empty',
        id: 'empty',
      },
      dropType: 'field_add' as DropType,
    } as unknown as DatasourceDimensionDropHandlerProps<TextBasedPrivateState>;
    const expectedColumns = [
      column1,
      column2,
      column3,
      { columnId: 'empty', fieldName: 'currency', meta: { type: 'string' } },
    ];
    expect(onDrop(props)).toEqual(
      expect.objectContaining({
        layers: {
          first: expect.objectContaining({
            columns: expectedColumns,
          }),
        },
      })
    );
  });
  it('should add the column when dropping a field controlled by a variable', () => {
    const props = {
      ...defaultProps,
      source: {
        field: 'field',
        id: 'field',
        humanData: {
          label: '?field',
        },
      },
      target: {
        layerId: 'first',
        groupId: 'x',
        isNewColumn: true,
        indexPatternId: '9de9a3c2-ae98-4180-b019-4d208e516b70',
        humanData: {
          groupLabel: 'Vertical axis',
          layerNumber: 1,
          position: 1,
          label: 'Empty dimension',
          nextLabel: '?field',
          canDuplicate: false,
        },
        columnId: 'empty',
        id: 'empty',
      },
      dropType: 'field_add' as DropType,
    } as unknown as DatasourceDimensionDropHandlerProps<TextBasedPrivateState>;
    const expectedColumns = [
      column1,
      column2,
      column3,
      { columnId: 'empty', fieldName: '?field', meta: { type: 'number' }, variable: 'field' },
    ];
    expect(onDrop(props)).toEqual(
      expect.objectContaining({
        layers: {
          first: expect.objectContaining({
            columns: expectedColumns,
          }),
        },
      })
    );
  });
  it('should replace the column with the field', () => {
    const props = {
      ...defaultProps,
      source: {
        field: 'currency',
        id: 'currency',
        humanData: {
          label: 'currency',
        },
      },
      dropType: 'field_replace' as DropType,
    };
    const expectedColumns = [
      column1,
      column2,
      { columnId: 'columnId3', fieldName: 'currency', meta: { type: 'string' } },
    ];
    expect(onDrop(props)).toEqual(
      expect.objectContaining({
        layers: {
          first: expect.objectContaining({
            columns: expectedColumns,
          }),
        },
      })
    );
  });
  it('should replace the column with the field if the field is controlled by a variable', () => {
    const props = {
      ...defaultProps,
      source: {
        field: 'field',
        id: 'field',
        humanData: {
          label: '?field',
        },
      },
      dropType: 'field_replace' as DropType,
    };
    const expectedColumns = [
      column1,
      column2,
      { columnId: 'columnId3', fieldName: '?field', meta: { type: 'number' }, variable: 'field' },
    ];
    expect(onDrop(props)).toEqual(
      expect.objectContaining({
        layers: {
          first: expect.objectContaining({
            columns: expectedColumns,
          }),
        },
      })
    );
  });
  it('should duplicate the dimension if dropType is duplicate_compatible', () => {
    const props = {
      ...defaultProps,
      dropType: 'duplicate_compatible' as DropType,
    };
    const expectedColumns = [column1, column2, { ...column1, columnId: 'columnId3' }];
    expect(onDrop(props)).toEqual(
      expect.objectContaining({
        layers: {
          first: expect.objectContaining({
            columns: expectedColumns,
          }),
        },
      })
    );
  });
});
