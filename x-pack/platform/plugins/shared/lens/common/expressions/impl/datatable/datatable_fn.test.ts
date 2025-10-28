/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type {
  Datatable,
  DefaultInspectorAdapters,
  ExecutionContext,
} from '@kbn/expressions-plugin/common';
import type { DatatableArgs } from '../..';
import { datatableFn } from './datatable_fn';
import { shuffle } from 'lodash';

const context = {
  variables: { embeddableTitle: 'title' },
} as unknown as ExecutionContext<DefaultInspectorAdapters>;

const mockFormatFactory = fieldFormatsServiceMock.createStartContract().deserialize;

describe('datatableFn', () => {
  function buildTable(): Datatable {
    return {
      type: 'datatable',
      columns: [
        { id: 'bucket1', name: 'bucket1', meta: { type: 'string' } },
        { id: 'bucket2', name: 'bucket2', meta: { type: 'string' } },
        { id: 'bucket3', name: 'bucket3', meta: { type: 'string' } },
        { id: 'metric1', name: 'metric1', meta: { type: 'number' } },
        { id: 'metric2', name: 'metric2', meta: { type: 'number' } },
      ],
      rows: [
        { bucket1: 'A', bucket2: 'D', bucket3: 'X', metric1: 1, metric2: 2 },
        { bucket1: 'A', bucket2: 'D', bucket3: 'Y', metric1: 3, metric2: 4 },
        { bucket1: 'A', bucket2: 'D', bucket3: 'Z', metric1: 5, metric2: 6 },
        { bucket1: 'A', bucket2: 'E', bucket3: 'X', metric1: 7, metric2: 8 },
        { bucket1: 'A', bucket2: 'E', bucket3: 'Y', metric1: 9, metric2: 10 },
        { bucket1: 'A', bucket2: 'E', bucket3: 'Z', metric1: 11, metric2: 12 },
        { bucket1: 'A', bucket2: 'F', bucket3: 'X', metric1: 13, metric2: 14 },
        { bucket1: 'A', bucket2: 'F', bucket3: 'Y', metric1: 15, metric2: 16 },
        { bucket1: 'A', bucket2: 'F', bucket3: 'Z', metric1: 17, metric2: 18 },
        { bucket1: 'B', bucket2: 'D', bucket3: 'X', metric1: 19, metric2: 20 },
        { bucket1: 'B', bucket2: 'D', bucket3: 'Y', metric1: 21, metric2: 22 },
        { bucket1: 'B', bucket2: 'D', bucket3: 'Z', metric1: 23, metric2: 24 },
        { bucket1: 'B', bucket2: 'E', bucket3: 'X', metric1: 25, metric2: 26 },
        { bucket1: 'B', bucket2: 'E', bucket3: 'Y', metric1: 27, metric2: 28 },
        { bucket1: 'B', bucket2: 'E', bucket3: 'Z', metric1: 29, metric2: 30 },
        { bucket1: 'B', bucket2: 'F', bucket3: 'X', metric1: 31, metric2: 32 },
        { bucket1: 'B', bucket2: 'F', bucket3: 'Y', metric1: 33, metric2: 34 },
        { bucket1: 'B', bucket2: 'F', bucket3: 'Z', metric1: 35, metric2: 36 },
        { bucket1: 'C', bucket2: 'D', bucket3: 'X', metric1: 37, metric2: 38 },
        { bucket1: 'C', bucket2: 'D', bucket3: 'Y', metric1: 39, metric2: 40 },
        { bucket1: 'C', bucket2: 'D', bucket3: 'Z', metric1: 41, metric2: 42 },
        { bucket1: 'C', bucket2: 'E', bucket3: 'X', metric1: 43, metric2: 44 },
        { bucket1: 'C', bucket2: 'E', bucket3: 'Y', metric1: 45, metric2: 46 },
        { bucket1: 'C', bucket2: 'E', bucket3: 'Z', metric1: 47, metric2: 48 },
        { bucket1: 'C', bucket2: 'F', bucket3: 'X', metric1: 49, metric2: 50 },
        { bucket1: 'C', bucket2: 'F', bucket3: 'Y', metric1: 51, metric2: 52 },
        { bucket1: 'C', bucket2: 'F', bucket3: 'Z', metric1: 53, metric2: 54 },
      ],
    };
  }

  function buildArgs(): DatatableArgs {
    return {
      title: 'Table',
      sortingColumnId: undefined,
      sortingDirection: 'none',
      columns: [
        {
          type: 'lens_datatable_column',
          columnId: 'bucket1',
          isTransposed: false,
          transposable: false,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'bucket2',
          isTransposed: false,
          transposable: false,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'bucket3',
          isTransposed: false,
          transposable: false,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'metric1',
          isTransposed: false,
          transposable: true,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'metric2',
          isTransposed: false,
          transposable: true,
        },
      ],
    };
  }

  it('should correctly sort columns in table by order of args.columns', async () => {
    const table = buildTable();
    const shuffledTable: Datatable = {
      ...table,
      columns: shuffle(table.columns),
    };
    const args = buildArgs();
    const result = await datatableFn(() => mockFormatFactory)(shuffledTable, args, context);

    const resultColumnIds = result.value.data.columns.map((c) => c.id);
    const expectedColumnIds = args.columns.map((c) => c.columnId);

    expect(resultColumnIds).toEqual(expectedColumnIds);
    expect(resultColumnIds).toEqual(['bucket1', 'bucket2', 'bucket3', 'metric1', 'metric2']);
  });
});
