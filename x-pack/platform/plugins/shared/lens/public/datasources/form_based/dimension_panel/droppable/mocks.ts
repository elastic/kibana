/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormBasedLayer } from '../../types';
import { documentField } from '../../document_field';
import { IndexPatternMap, OperationMetadata } from '../../../../types';
import {
  DateHistogramIndexPatternColumn,
  GenericIndexPatternColumn,
  StaticValueIndexPatternColumn,
  TermsIndexPatternColumn,
} from '../../operations';
import { getFieldByNameFactory } from '../../pure_helpers';
jest.mock('../../../../id_generator');

export const mockDataViews = (): IndexPatternMap => {
  const fields = [
    {
      name: 'timestamp',
      displayName: 'timestampLabel',
      type: 'date',
      aggregatable: true,
      searchable: true,
      exists: true,
    },
    {
      name: 'bytes',
      displayName: 'bytes',
      type: 'number',
      aggregatable: true,
      searchable: true,
      exists: true,
    },
    {
      name: 'memory',
      displayName: 'memory',
      type: 'number',
      aggregatable: true,
      searchable: true,
      exists: true,
    },
    {
      name: 'source',
      displayName: 'source',
      type: 'string',
      aggregatable: true,
      searchable: true,
      exists: true,
    },
    {
      name: 'src',
      displayName: 'src',
      type: 'string',
      aggregatable: true,
      searchable: true,
      exists: true,
    },
    {
      name: 'dest',
      displayName: 'dest',
      type: 'string',
      aggregatable: true,
      searchable: true,
      exists: true,
    },
    documentField,
  ];
  return {
    first: {
      id: 'first',
      title: 'first',
      timeFieldName: 'timestamp',
      hasRestrictions: false,
      fields,
      getFieldByName: getFieldByNameFactory(fields),
      isPersisted: true,
      spec: {},
    },
    second: {
      id: 'second',
      title: 'my-fake-restricted-pattern',
      hasRestrictions: true,
      timeFieldName: 'timestamp',
      fields: [fields[0]],
      getFieldByName: getFieldByNameFactory([fields[0]]),
      isPersisted: true,
      spec: {},
    },
  };
};

export const mockedColumns: Record<string, GenericIndexPatternColumn> = {
  count: {
    label: 'Count of records',
    dataType: 'number',
    isBucketed: false,
    sourceField: '___records___',
    operationType: 'count',
  },
  staticValue: {
    label: 'Static value: 0.75',
    dataType: 'number',
    operationType: 'static_value',
    isStaticValue: true,
    isBucketed: false,
    scale: 'ratio',
    params: {
      value: '0.75',
    },
    references: [],
  } as StaticValueIndexPatternColumn,
  dateHistogram: {
    label: 'Date histogram of timestamp',
    customLabel: true,
    dataType: 'date',
    isBucketed: true,

    // Private
    operationType: 'date_histogram',
    params: {
      interval: '1d',
    },
    sourceField: 'timestamp',
  } as DateHistogramIndexPatternColumn,
  dateHistogramCopy: {
    label: 'Date histogram of timestamp (1)',
    customLabel: true,
    dataType: 'date',
    isBucketed: true,

    // Private
    operationType: 'date_histogram',
    params: {
      interval: '1d',
    },
    sourceField: 'timestamp',
  } as DateHistogramIndexPatternColumn,
  terms: {
    label: 'Top 10 values of src',
    dataType: 'string',
    isBucketed: true,
    // Private
    operationType: 'terms',
    params: {
      orderBy: { type: 'alphabetical' },
      orderDirection: 'desc',
      size: 10,
    },
    sourceField: 'src',
  } as TermsIndexPatternColumn,
  terms2: {
    label: 'Top 10 values of dest',
    dataType: 'string',
    isBucketed: true,

    // Private
    operationType: 'terms',
    params: {
      orderBy: { type: 'alphabetical' },
      orderDirection: 'desc',
      size: 10,
    },
    sourceField: 'dest',
  } as TermsIndexPatternColumn,
  sum: {
    label: 'Sum of bytes',
    dataType: 'number',
    isBucketed: false,
    operationType: 'sum',
    sourceField: 'bytes',
  } as GenericIndexPatternColumn,
  median: {
    label: 'Median of bytes',
    dataType: 'number',
    isBucketed: false,

    // Private
    operationType: 'median',
    sourceField: 'bytes',
  } as GenericIndexPatternColumn,
  uniqueCount: {
    label: 'Unique count of bytes',
    dataType: 'number',
    isBucketed: false,
    sourceField: 'bytes',
    operationType: 'unique_count',
  } as GenericIndexPatternColumn,
};

export const mockedLayers: Record<string, (...args: string[]) => FormBasedLayer> = {
  singleColumnLayer: (id = 'col1') => ({
    indexPatternId: 'first',
    columnOrder: [id],
    columns: {
      [id]: mockedColumns.dateHistogram,
    },
    incompleteColumns: {},
  }),
  doubleColumnLayer: (id1 = 'col1', id2 = 'col2') => ({
    indexPatternId: 'first',
    columnOrder: [id1, id2],
    columns: {
      [id1]: mockedColumns.dateHistogram,
      [id2]: mockedColumns.terms,
    },
    incompleteColumns: {},
  }),
  multipleColumnsLayer: (id1 = 'col1', id2 = 'col2', id3 = 'col3', id4 = 'col4') => ({
    indexPatternId: 'first',
    columnOrder: [id1, id2, id3, id4],
    columns: {
      [id1]: mockedColumns.dateHistogram,
      [id2]: mockedColumns.terms,
      [id3]: mockedColumns.terms2,
      [id4]: mockedColumns.median,
    },
  }),
  emptyLayer: () => ({
    indexPatternId: 'first',
    columnOrder: [],
    columns: {},
  }),
};

export const mockedDraggedField = {
  field: { type: 'number', name: 'bytes', aggregatable: true },
  indexPatternId: 'first',
  id: 'bar',
  humanData: { label: 'Label' },
};

export const mockedDndOperations = {
  notFiltering: {
    layerId: 'first',
    groupId: 'a',
    filterOperations: () => true,
    columnId: 'col1',
    id: 'col1',
    humanData: { label: 'Column 1' },
    indexPatternId: 'first',
  },
  metric: {
    layerId: 'first',
    groupId: 'a',
    columnId: 'col1',
    filterOperations: (op: OperationMetadata) => !op.isBucketed,
    id: 'col1',
    humanData: { label: 'Column 1' },
    indexPatternId: 'first',
  },
  numericalOnly: {
    layerId: 'first',
    groupId: 'a',
    columnId: 'col1',
    filterOperations: (op: OperationMetadata) => op.dataType === 'number',
    id: 'col1',
    humanData: { label: 'Column 1' },
    indexPatternId: 'first',
  },
  bucket: {
    columnId: 'col2',
    groupId: 'b',
    layerId: 'first',
    id: 'col2',
    humanData: { label: 'Column 2' },
    filterOperations: (op: OperationMetadata) => op.isBucketed,
    indexPatternId: 'first',
  },
  staticValue: {
    columnId: 'col1',
    groupId: 'b',
    layerId: 'first',
    id: 'col1',
    humanData: { label: 'Column 2' },
    filterOperations: (op: OperationMetadata) => !!op.isStaticValue,
    indexPatternId: 'first',
  },
  bucket2: {
    columnId: 'col3',
    groupId: 'b',
    layerId: 'first',
    id: 'col3',
    humanData: {
      label: '',
    },
    indexPatternId: 'first',
  },
  metricC: {
    columnId: 'col4',
    groupId: 'c',
    layerId: 'first',
    id: 'col4',
    humanData: {
      label: '',
    },
    filterOperations: (op: OperationMetadata) => !op.isBucketed,
    indexPatternId: 'first',
  },
};
