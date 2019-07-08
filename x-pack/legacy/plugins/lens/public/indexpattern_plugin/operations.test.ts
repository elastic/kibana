/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOperationTypesForField, getPotentialColumns } from './operations';
import { IndexPatternPrivateState } from './indexpattern';
import { hasField } from './state_helpers';

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    fields: [
      {
        name: 'timestamp',
        type: 'date',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'bytes',
        type: 'number',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'source',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
};

describe('getOperationTypesForField', () => {
  describe('with aggregatable fields', () => {
    it('should return operations on strings', () => {
      expect(
        getOperationTypesForField({
          type: 'string',
          name: 'a',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual(expect.arrayContaining(['terms']));
    });

    it('should return operations on numbers', () => {
      expect(
        getOperationTypesForField({
          type: 'number',
          name: 'a',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual(expect.arrayContaining(['avg', 'sum', 'min', 'max']));
    });

    it('should return operations on dates', () => {
      expect(
        getOperationTypesForField({
          type: 'date',
          name: 'a',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual(expect.arrayContaining(['date_histogram']));
    });

    it('should return no operations on unknown types', () => {
      expect(
        getOperationTypesForField({
          type: '_source',
          name: 'a',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual([]);
    });
  });

  describe('with restrictions', () => {
    it('should return operations on strings', () => {
      expect(
        getOperationTypesForField({
          type: 'string',
          name: 'a',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            terms: {
              agg: 'terms',
            },
          },
        })
      ).toEqual(expect.arrayContaining(['terms']));
    });

    it('should return operations on numbers', () => {
      expect(
        getOperationTypesForField({
          type: 'number',
          name: 'a',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            min: {
              agg: 'min',
            },
            max: {
              agg: 'max',
            },
          },
        })
      ).toEqual(expect.arrayContaining(['min', 'max']));
    });

    it('should return operations on dates', () => {
      expect(
        getOperationTypesForField({
          type: 'date',
          name: 'a',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            date_histogram: {
              agg: 'date_histogram',
              fixed_interval: '60m',
              delay: '1d',
              time_zone: 'UTC',
            },
          },
        })
      ).toEqual(expect.arrayContaining(['date_histogram']));
    });
  });

  describe('getPotentialColumns', () => {
    let state: IndexPatternPrivateState;

    beforeEach(() => {
      state = {
        indexPatterns: expectedIndexPatterns,
        currentIndexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            operationId: 'op1',
            label: 'Date Histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            params: {
              interval: 'h',
            },
          },
        },
      };
    });

    it('should include priority', () => {
      const columns = getPotentialColumns(
        state.indexPatterns[state.currentIndexPatternId].fields,
        1
      );

      expect(columns.every(col => col.suggestedOrder === 1)).toEqual(true);
    });

    it('should list operations by field for a regular index pattern', () => {
      const columns = getPotentialColumns(state.indexPatterns[state.currentIndexPatternId].fields);

      expect(
        columns.map(col => [hasField(col) ? col.sourceField : '_documents_', col.operationType])
      ).toMatchInlineSnapshot(`
Array [
  Array [
    "bytes",
    "min",
  ],
  Array [
    "bytes",
    "max",
  ],
  Array [
    "bytes",
    "avg",
  ],
  Array [
    "_documents_",
    "count",
  ],
  Array [
    "bytes",
    "sum",
  ],
  Array [
    "source",
    "terms",
  ],
  Array [
    "timestamp",
    "date_histogram",
  ],
]
`);
    });
  });
});
