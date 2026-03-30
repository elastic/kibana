/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkReferences,
  checkForDataLayerType,
  dateBasedOperationToExpression,
  getReferencedColumnLabel,
} from './utils';
import { operationDefinitionMap } from '..';
import { createMockedFullReference } from '../../mocks';
import { createMockedIndexPattern } from '../../../mocks';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type {
  DateHistogramIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  FormBasedLayer,
  ReferenceBasedIndexPatternColumn,
} from '@kbn/lens-common';
import {
  CALCULATIONS_MISSING_COLUMN_REFERENCE,
  CALCULATIONS_WRONG_DIMENSION_CONFIG,
} from '../../../../../user_messages_ids';

// Mock prevents issue with circular loading
jest.mock('..');

describe('utils', () => {
  beforeEach(() => {
    // @ts-expect-error test-only operation type
    operationDefinitionMap.testReference = createMockedFullReference();
  });

  describe('checkForDataLayerType', () => {
    it('should return an error if the layer is of the wrong type', () => {
      expect(checkForDataLayerType(LayerTypes.REFERENCELINE, 'Operation')).toEqual([
        'Operation is disabled for this type of layer.',
      ]);
    });
  });

  describe('checkReferences', () => {
    it('should show an error if the reference is missing', () => {
      expect(
        checkReferences(
          {
            columns: {
              ref: {
                label: 'Label',
                operationType: 'testReference',
                isBucketed: false,
                dataType: 'number',
                references: ['missing'],
              },
            },
            columnOrder: ['ref'],
            indexPatternId: '',
          },
          'ref'
        )
      ).toEqual([
        {
          uniqueId: CALCULATIONS_MISSING_COLUMN_REFERENCE,
          message: '"Label" is not fully configured',
        },
      ]);
    });

    it('should show an error if the reference is not allowed per the requirements', () => {
      expect(
        checkReferences(
          {
            columns: {
              ref: {
                label: 'Label',
                operationType: 'testReference',
                isBucketed: false,
                dataType: 'number',
                references: ['invalid'],
              },
              invalid: {
                label: 'Date',
                operationType: 'date_histogram',
                isBucketed: true,
                dataType: 'date',
                sourceField: 'timestamp',
                params: { interval: 'auto' },
              } as DateHistogramIndexPatternColumn,
            },
            columnOrder: ['invalid', 'ref'],
            indexPatternId: '',
          },
          'ref'
        )
      ).toEqual([
        {
          uniqueId: CALCULATIONS_WRONG_DIMENSION_CONFIG,
          message: 'Dimension "Label" is configured incorrectly',
        },
      ]);
    });
  });

  describe('getReferencedColumnLabel', () => {
    it('should return undefined if the column does not exist', () => {
      expect(getReferencedColumnLabel('missing', {})).toBeUndefined();
    });

    it('should return the column label when it is set', () => {
      const columns: Record<string, FieldBasedIndexPatternColumn> = {
        col1: {
          label: 'My custom label',
          customLabel: true,
          operationType: 'average',
          isBucketed: false,
          dataType: 'number' as const,
          sourceField: 'bytes',
        },
      };
      expect(getReferencedColumnLabel('col1', columns)).toBe('My custom label');
    });

    it('should fall back to getDefaultLabel when the column has no label', () => {
      const indexPattern = createMockedIndexPattern();
      const columns: Record<string, ReferenceBasedIndexPatternColumn> = {
        col1: {
          label: '',
          operationType: 'testReference',
          isBucketed: false,
          dataType: 'number' as const,
          references: ['other'],
        },
      };

      const result = getReferencedColumnLabel('col1', columns, indexPattern);

      expect(operationDefinitionMap.testReference.getDefaultLabel).toHaveBeenCalledWith(
        columns.col1,
        columns,
        indexPattern
      );
      expect(result).toBe('Default label');
    });
  });

  describe('dateBasedOperationToExpression', () => {
    const indexPattern = createMockedIndexPattern();

    const buildLayer = (overrides?: Partial<FormBasedLayer>): FormBasedLayer => ({
      indexPatternId: '1',
      columnOrder: ['dateCol', 'metricCol', 'refCol'],
      columns: {
        dateCol: {
          label: 'Date',
          operationType: 'date_histogram',
          isBucketed: true,
          dataType: 'date',
          sourceField: 'timestamp',
          params: { interval: 'auto' },
        } as DateHistogramIndexPatternColumn,
        metricCol: {
          label: 'Average of bytes',
          operationType: 'average',
          isBucketed: false,
          dataType: 'number',
          sourceField: 'bytes',
        },
        refCol: {
          label: 'Cumulative sum of Average of bytes',
          operationType: 'testReference',
          isBucketed: false,
          dataType: 'number',
          references: ['metricCol'],
        },
      },
      ...overrides,
    });

    it('should return an expression with the correct function name and arguments', () => {
      const layer = buildLayer();
      const result = dateBasedOperationToExpression(
        layer,
        'refCol',
        'cumulative_sum',
        {},
        indexPattern
      );

      expect(result).toEqual([
        {
          type: 'function',
          function: 'cumulative_sum',
          arguments: {
            by: [],
            inputColumnId: ['metricCol'],
            outputColumnId: ['refCol'],
            outputColumnName: ['Cumulative sum of Average of bytes'],
          },
        },
      ]);
    });

    it('should include additional arguments when provided', () => {
      const layer = buildLayer();
      const result = dateBasedOperationToExpression(
        layer,
        'refCol',
        'moving_average',
        { window: [5] },
        indexPattern
      );

      expect(result).toEqual([
        {
          type: 'function',
          function: 'moving_average',
          arguments: {
            by: [],
            inputColumnId: ['metricCol'],
            outputColumnId: ['refCol'],
            outputColumnName: ['Cumulative sum of Average of bytes'],
            window: [5],
          },
        },
      ]);
    });

    it('should fall back to getDefaultLabel when the column has no label', () => {
      const layer = buildLayer({
        columns: {
          ...buildLayer().columns,
          refCol: {
            label: '',
            operationType: 'testReference',
            isBucketed: false,
            dataType: 'number',
            references: ['metricCol'],
          },
        },
      });

      const result = dateBasedOperationToExpression(
        layer,
        'refCol',
        'cumulative_sum',
        {},
        indexPattern
      );

      expect(operationDefinitionMap.testReference.getDefaultLabel).toHaveBeenCalledWith(
        layer.columns.refCol,
        layer.columns,
        indexPattern
      );
      expect(result[0].arguments.outputColumnName).toEqual(['Default label']);
    });
  });
});
