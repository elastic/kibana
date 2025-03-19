/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DragDropOperation, OperationMetadata } from '../../../../types';
import { TermsIndexPatternColumn } from '../../operations';
import { getDropProps } from './get_drop_props';
import {
  mockDataViews,
  mockedLayers,
  mockedDraggedField,
  mockedDndOperations,
  mockedColumns,
} from './mocks';
import { generateId } from '../../../../id_generator';

const getDefaultProps = () => ({
  indexPatterns: mockDataViews(),
  state: {
    currentIndexPatternId: 'first',
    layers: { first: mockedLayers.doubleColumnLayer(), second: mockedLayers.emptyLayer() },
  },
  target: mockedDndOperations.notFiltering,
  source: mockedDndOperations.bucket,
});

describe('FormBasedDimensionEditorPanel#getDropProps', () => {
  describe('not dragging', () => {
    it('returns undefined if no drag is happening', () => {
      expect(getDropProps({ ...getDefaultProps(), source: undefined })).toBe(undefined);
    });

    it('returns undefined if the dragged item has no field', () => {
      expect(
        getDropProps({
          ...getDefaultProps(),
          source: { name: 'bar', id: 'bar', humanData: { label: 'Label' } },
        })
      ).toBe(undefined);
    });
  });

  describe('dragging a field', () => {
    it('returns undefined if field is not supported by filterOperations', () => {
      expect(
        getDropProps({
          ...getDefaultProps(),
          source: mockedDraggedField,
          target: mockedDndOperations.staticValue,
        })
      ).toBe(undefined);
    });

    it('returns field_replace if the field is supported by filterOperations and the dropTarget is an existing column', () => {
      expect(
        getDropProps({
          ...getDefaultProps(),
          target: mockedDndOperations.numericalOnly,
          source: mockedDraggedField,
        })
      ).toEqual({ dropTypes: ['field_replace'], nextLabel: 'Intervals' });
    });

    it('returns field_add if the field is supported by filterOperations and the dropTarget is an empty column', () => {
      expect(
        getDropProps({
          ...getDefaultProps(),
          target: {
            ...mockedDndOperations.numericalOnly,
            columnId: 'newId',
          },
          source: mockedDraggedField,
        })
      ).toEqual({ dropTypes: ['field_add'], nextLabel: 'Intervals' });
    });

    it('returns undefined if the field belongs to another data view', () => {
      expect(
        getDropProps({
          ...getDefaultProps(),
          source: {
            ...mockedDraggedField,
            indexPatternId: 'first2',
          },
        })
      ).toBe(undefined);
    });

    it('returns undefined if the dragged field is already in use by this operation', () => {
      expect(
        getDropProps({
          ...getDefaultProps(),
          source: {
            ...mockedDraggedField,
            field: {
              name: 'timestamp',
              displayName: 'timestampLabel',
              type: 'date',
              aggregatable: true,
              searchable: true,
              exists: true,
            },
          },
        })
      ).toBe(undefined);
    });

    it('returns also field_combine if the field is supported by filterOperations and the dropTarget is an existing column that supports multiple fields', () => {
      // replace the state with a top values column to enable the multi fields behaviour
      const props = getDefaultProps();
      expect(
        getDropProps({
          ...props,
          source: mockedDraggedField,
          target: {
            ...props.target,
            columnId: 'col2',
            filterOperations: (op: OperationMetadata) => op.dataType !== 'date',
          },
        })
      ).toEqual({ dropTypes: ['field_replace', 'field_combine'] });
    });
  });

  describe('dragging a column', () => {
    it('allows replacing and replace-duplicating when two columns from compatible groups use the same field', () => {
      const props = getDefaultProps();
      props.state.layers.first.columns.col2 = mockedColumns.dateHistogramCopy;

      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            columnId: 'col2',
          },
          source: {
            ...mockedDndOperations.metric,
            groupId: 'c',
          },
        })
      ).toEqual({ dropTypes: ['replace_compatible', 'replace_duplicate_compatible'] });
    });

    it('returns correct dropTypes if the dragged column from different group uses the same fields as the dropTarget', () => {
      const props = getDefaultProps();
      const sourceMultiFieldColumn = {
        ...props.state.layers.first.columns.col1,
        sourceField: 'bytes',
        params: {
          ...(props.state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
          secondaryFields: ['dest'],
        },
      } as TermsIndexPatternColumn;
      // invert the fields
      const targetMultiFieldColumn = {
        ...props.state.layers.first.columns.col1,
        sourceField: 'dest',
        params: {
          ...(props.state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
          secondaryFields: ['bytes'],
        },
      } as TermsIndexPatternColumn;
      props.state.layers.first.columns = {
        col1: sourceMultiFieldColumn,
        col2: targetMultiFieldColumn,
      };

      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            columnId: 'col2',
          },
          source: {
            ...mockedDndOperations.metric,
            groupId: 'c',
          },
        })
      ).toEqual({ dropTypes: ['replace_compatible', 'replace_duplicate_compatible'] });
    });

    it('returns duplicate and replace if the dragged column from different group uses the same field as the dropTarget, but this last one is multifield, and can be swappable', () => {
      const props = getDefaultProps();
      props.state.layers.first.columns.col2 = {
        ...props.state.layers.first.columns.col1,
        sourceField: 'bytes',
        params: {
          ...(props.state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
          secondaryFields: ['dest'],
        },
      } as TermsIndexPatternColumn;

      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            columnId: 'col2',
          },
          source: {
            ...mockedDndOperations.metric,
            groupId: 'c',
          },
        })
      ).toEqual({
        dropTypes: ['replace_compatible', 'replace_duplicate_compatible'],
      });
    });

    it('returns swap, duplicate and replace if the dragged column from different group uses the same field as the dropTarget, but this last one is multifield', () => {
      const props = getDefaultProps();
      props.state.layers.first.columns.col2 = {
        ...props.state.layers.first.columns.col1,
        sourceField: 'bytes',
        params: {
          ...(props.state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
          secondaryFields: ['dest'],
        },
      } as TermsIndexPatternColumn;

      expect(
        getDropProps({
          ...props,
          ...props,
          // make it swappable
          target: {
            ...props.target,
            filterOperations: (op: OperationMetadata) => op.isBucketed,
            groupId: 'a',
            columnId: 'col2',
          },
          source: {
            ...mockedDndOperations.metric,
            filterOperations: (op: OperationMetadata) => op.isBucketed,
            groupId: 'c',
          },
        })
      ).toEqual({
        dropTypes: ['replace_compatible', 'replace_duplicate_compatible', 'swap_compatible'],
      });
    });

    it('returns reorder if drop target and source columns are from the same group and both are existing', () => {
      const props = getDefaultProps();
      props.state.layers.first.columns.col2 = mockedColumns.sum;

      expect(
        getDropProps({
          ...props,
          source: { ...mockedDndOperations.metric, groupId: 'a' },
          target: {
            ...props.target,
            columnId: 'col2',
            filterOperations: (op: OperationMetadata) => op.isBucketed === false,
          },
        })
      ).toEqual({
        dropTypes: ['reorder'],
      });
    });

    it('returns duplicate_compatible if drop target and source columns are from the same group and drop target id is a new column', () => {
      const props = getDefaultProps();
      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            groupId: 'a',
            columnId: 'newId',
          },
          source: {
            ...mockedDndOperations.metric,
            groupId: 'a',
          },
        })
      ).toEqual({ dropTypes: ['duplicate_compatible'] });
    });

    it('returns compatible drop types if the dragged column is compatible', () => {
      const props = getDefaultProps();
      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            groupId: 'a',
            columnId: 'col3',
          },
          source: {
            ...mockedDndOperations.metric,
            groupId: 'c',
          },
        })
      ).toEqual({ dropTypes: ['move_compatible', 'duplicate_compatible'] });
    });

    it('returns incompatible drop target types if dropping column to existing incompatible column', () => {
      const props = getDefaultProps();
      props.state.layers.first.columns = {
        col1: mockedColumns.dateHistogram,
        col2: mockedColumns.sum,
      };

      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            columnId: 'col2',
            filterOperations: (op: OperationMetadata) => op.isBucketed === false,
          },
          source: {
            ...mockedDndOperations.metric,
            groupId: 'c',
          },
        })
      ).toEqual({
        dropTypes: ['replace_incompatible', 'replace_duplicate_incompatible', 'swap_incompatible'],
        nextLabel: 'Minimum',
      });
    });

    it('does not return swap_incompatible if current dropTarget column cannot be swapped to the group of dragging column', () => {
      const props = getDefaultProps();
      props.state.layers.first.columns = {
        col1: mockedColumns.dateHistogram,
        col2: mockedColumns.count,
      };

      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            columnId: 'col2',
            filterOperations: (op: OperationMetadata) => op.isBucketed === false,
          },
          source: {
            columnId: 'col1',
            groupId: 'b',
            layerId: 'first',
            id: 'col1',
            humanData: { label: 'Label' },
            filterOperations: (op: OperationMetadata) => op.isBucketed === true,
          },
        })
      ).toEqual({
        dropTypes: ['replace_incompatible', 'replace_duplicate_incompatible'],
        nextLabel: 'Count',
      });
    });

    it('returns combine_compatible drop type if the dragged column is compatible and the target one support multiple fields', () => {
      const props = getDefaultProps();
      props.state.layers.first.columns = {
        col1: mockedColumns.terms,
        col2: {
          ...mockedColumns.terms,
          sourceField: 'bytes',
        },
      };
      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            columnId: 'col2',
          },
          source: {
            ...mockedDndOperations.metric,
            groupId: 'c',
          },
        })
      ).toEqual({
        dropTypes: ['replace_compatible', 'replace_duplicate_compatible', 'combine_compatible'],
      });
    });

    it('returns no combine_compatible drop type if the target column uses rarity ordering', () => {
      const props = getDefaultProps();
      props.state.layers.first.columns = {
        col1: mockedColumns.terms,
        col2: {
          ...mockedColumns.terms,
          sourceField: 'bytes',
          params: {
            ...(props.state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
            orderBy: { type: 'rare' },
          },
        } as TermsIndexPatternColumn,
      };

      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            groupId: 'a',
            columnId: 'col2',
          },
          source: {
            ...mockedDndOperations.metric,
            groupId: 'c',
          },
        })
      ).toEqual({
        dropTypes: ['replace_compatible', 'replace_duplicate_compatible'],
      });
    });

    it('returns no combine drop type if the dragged column is compatible, the target one supports multiple fields but there are too many fields', () => {
      const props = getDefaultProps();
      props.state.layers.first.columns.col2 = {
        ...props.state.layers.first.columns.col1,
        sourceField: 'source',
        params: {
          ...(props.state.layers.first.columns.col1 as TermsIndexPatternColumn).params,
          secondaryFields: ['memory', 'bytes', 'geo.src'], // too many fields here
        },
      } as TermsIndexPatternColumn;

      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            groupId: 'a',
            columnId: 'col2',
          },
          source: {
            ...mockedDndOperations.metric,
            groupId: 'c',
          },
        })
      ).toEqual({
        dropTypes: ['replace_compatible', 'replace_duplicate_compatible'],
      });
    });

    it('returns combine_incompatible drop target types if dropping column to existing incompatible column which supports multiple fields', () => {
      const props = getDefaultProps();
      props.state.layers.first.columns = {
        col1: mockedColumns.terms,
        col2: mockedColumns.sum,
      };

      expect(
        getDropProps({
          ...props,
          target: {
            ...props.target,
            groupId: 'a',
            filterOperations: (op: OperationMetadata) => op.isBucketed,
          },
          // drag the sum over the top values
          source: {
            ...mockedDndOperations.bucket,
            groupId: 'c',
            filterOperation: undefined,
          },
        })
      ).toEqual({
        dropTypes: [
          'replace_incompatible',
          'replace_duplicate_incompatible',
          'swap_incompatible',
          'combine_incompatible',
        ],
        nextLabel: 'Top values',
      });
    });
  });

  describe('getDropProps between layers', () => {
    it('allows dropping to the same group', () => {
      const props = getDefaultProps();
      expect(
        getDropProps({
          ...props,
          source: {
            ...mockedDndOperations.metric,
            columnId: 'col1',
            layerId: 'first',
            groupId: 'c',
          },
          target: {
            ...props.target,
            columnId: 'newId',
            groupId: 'c',
            layerId: 'second',
          },
        })
      ).toEqual({
        dropTypes: ['move_compatible', 'duplicate_compatible'],
      });
    });
    it('allows dropping to compatible groups', () => {
      const props = getDefaultProps();
      expect(
        getDropProps({
          ...props,
          source: {
            ...mockedDndOperations.metric,
            columnId: 'col1',
            layerId: 'first',
            groupId: 'a',
          },
          target: {
            ...props.target,
            columnId: 'newId',
            groupId: 'c',
            layerId: 'second',
          },
        })
      ).toEqual({
        dropTypes: ['move_compatible', 'duplicate_compatible'],
      });
    });
    it('allows incompatible drop', () => {
      const props = getDefaultProps();
      expect(
        getDropProps({
          ...props,
          source: {
            ...mockedDndOperations.metric,
            columnId: 'col1',
            layerId: 'first',
            groupId: 'c',
            filterOperations: (op: OperationMetadata) => op.isBucketed,
          },
          target: {
            ...props.target,
            columnId: 'newId',
            groupId: 'c',
            layerId: 'second',
            filterOperations: (op: OperationMetadata) => !op.isBucketed,
          },
        })?.dropTypes
      ).toEqual(['move_incompatible', 'duplicate_incompatible']);
    });
    it('allows dropping references', () => {
      const props = getDefaultProps();
      const referenceDragging = {
        columnId: 'col1',
        groupId: 'a',
        layerId: 'first',
        id: 'col1',
        humanData: { label: 'Label' },
      };

      (generateId as jest.Mock).mockReturnValue(`ref1Copy`);
      props.state = {
        ...props.state,
        layers: {
          ...props.state.layers,
          first: {
            indexPatternId: 'first',
            columnOrder: ['col1', 'ref1'],
            columns: {
              col1: {
                label: 'Test reference',
                dataType: 'number',
                isBucketed: false,
                operationType: 'cumulative_sum',
                references: ['ref1'],
              },
              ref1: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,
                sourceField: '___records___',
                operationType: 'count',
              },
            },
          },
        },
      };

      expect(
        getDropProps({
          ...props,
          source: referenceDragging,
          target: {
            ...props.target,
            columnId: 'newColumnId',
            groupId: 'c',
            layerId: 'second',
            filterOperations: (op: OperationMetadata) => !op.isBucketed,
          },
        })?.dropTypes
      ).toEqual(['move_compatible', 'duplicate_compatible']);
    });
    it('doesnt allow dropping for different index patterns', () => {
      const props = getDefaultProps();
      props.state.layers.second.indexPatternId = 'different index';
      expect(
        getDropProps({
          ...props,
          source: {
            ...mockedDndOperations.metric,
            columnId: 'col1',
            layerId: 'first',
            groupId: 'c',
            filterOperations: (op: OperationMetadata) => op.isBucketed,
          },
          target: {
            ...props.target,
            columnId: 'newId',
            groupId: 'c',
            layerId: 'second',
            filterOperations: (op: OperationMetadata) => !op.isBucketed,
          },
        })?.dropTypes
      ).toEqual(undefined);
    });

    it('does not allow static value to be moved when not allowed', () => {
      const props = getDefaultProps();
      props.state.layers = {
        first: {
          indexPatternId: 'first',
          columns: {
            col1: mockedColumns.dateHistogram,
            colMetric: mockedColumns.count,
          },
          columnOrder: ['col1', 'colMetric'],
          incompleteColumns: {},
        },
        second: {
          indexPatternId: 'first',
          columns: {
            staticValue: mockedColumns.staticValue,
          },
          columnOrder: ['staticValue'],
          incompleteColumns: {},
        },
      };
      expect(
        getDropProps({
          ...props,
          source: {
            columnId: 'staticValue',
            groupId: 'yReferenceLineLeft',
            layerId: 'second',
            id: 'staticValue',
            humanData: { label: 'Label' },
          },
          target: {
            layerId: 'first',
            columnId: 'col1',
            groupId: 'x',
          } as DragDropOperation,
        })?.dropTypes
      ).toEqual(undefined);
    });
    it('allow multiple drop types from terms to terms', () => {
      const props = getDefaultProps();
      props.state.layers = {
        first: {
          indexPatternId: 'first',
          columns: {
            terms: mockedColumns.terms,
            metric: mockedColumns.count,
          },
          columnOrder: ['terms', 'metric'],
          incompleteColumns: {},
        },
        second: {
          indexPatternId: 'first',
          columns: {
            terms2: mockedColumns.terms2,
            metric2: mockedColumns.count,
          },
          columnOrder: ['terms2', 'metric2'],
          incompleteColumns: {},
        },
      };
      expect(
        getDropProps({
          ...props,
          source: {
            columnId: 'terms',
            groupId: 'x',
            layerId: 'first',
            id: 'terms',
            humanData: { label: 'Label' },
            filterOperations: (op: OperationMetadata) => op.isBucketed,
          },
          target: {
            columnId: 'terms2',
            groupId: 'x',
            layerId: 'second',
            filterOperations: (op: OperationMetadata) => op.isBucketed,
          } as DragDropOperation,
        })?.dropTypes
      ).toEqual([
        'replace_compatible',
        'replace_duplicate_compatible',
        'swap_compatible',
        'combine_compatible',
      ]);
    });
    it('allow multiple drop types from metric on field to terms', () => {
      const props = getDefaultProps();
      props.state.layers = {
        first: {
          indexPatternId: 'first',
          columns: {
            sum: mockedColumns.sum,
            metric: mockedColumns.count,
          },
          columnOrder: ['sum', 'metric'],
          incompleteColumns: {},
        },
        second: {
          indexPatternId: 'first',
          columns: {
            terms2: mockedColumns.terms2,
            metric2: mockedColumns.count,
          },
          columnOrder: ['terms2', 'metric2'],
          incompleteColumns: {},
        },
      };
      expect(
        getDropProps({
          ...props,
          source: {
            columnId: 'sum',
            groupId: 'x',
            layerId: 'first',
            id: 'sum',
            humanData: { label: 'Label' },
            filterOperations: (op: OperationMetadata) => !op.isBucketed,
          },
          target: {
            columnId: 'terms2',
            groupId: 'x',
            layerId: 'second',
            filterOperations: (op: OperationMetadata) => op.isBucketed,
          } as DragDropOperation,
        })?.dropTypes
      ).toEqual([
        'replace_incompatible',
        'replace_duplicate_incompatible',
        'swap_incompatible',
        'combine_incompatible',
      ]);
    });
  });
});
