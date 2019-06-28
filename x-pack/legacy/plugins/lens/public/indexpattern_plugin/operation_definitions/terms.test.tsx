/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { termsOperation } from './terms';
import { shallow } from 'enzyme';
import { IndexPatternPrivateState, TermsIndexPatternColumn } from '../indexpattern';
import { EuiRange, EuiSelect } from '@elastic/eui';

describe('terms', () => {
  let state: IndexPatternPrivateState;
  const InlineOptions = termsOperation.paramEditor!;

  beforeEach(() => {
    state = {
      indexPatterns: {},
      currentIndexPatternId: '1',
      columnOrder: ['col1', 'col2'],
      columns: {
        col1: {
          operationId: 'op1',
          label: 'Top value of category',
          dataType: 'string',
          isBucketed: true,

          // Private
          operationType: 'terms',
          params: {
            orderBy: { type: 'alphabetical' },
            size: 5,
            orderDirection: 'asc',
          },
          sourceField: 'category',
        },
        col2: {
          operationId: 'op1',
          label: 'Count',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'count',
        },
      },
    };
  });

  describe('toEsAggsConfig', () => {
    it('should reflect params correctly', () => {
      const esAggsConfig = termsOperation.toEsAggsConfig(
        state.columns.col1 as TermsIndexPatternColumn,
        'col1'
      );
      expect(esAggsConfig).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            orderBy: '_key',
            field: 'category',
            size: 5,
          }),
        })
      );
    });
  });

  describe('buildColumn', () => {
    it('should use existing metric column as order column', () => {
      const termsColumn = termsOperation.buildColumn('abc', {
        col1: {
          operationId: 'op1',
          label: 'Count',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'count',
        },
      });
      expect(termsColumn.params).toEqual(
        expect.objectContaining({
          orderBy: { type: 'column', columnId: 'col1' },
        })
      );
    });
  });

  describe('onOtherColumnChanged', () => {
    it('should keep the column if order by column still exists and is metric', () => {
      const initialColumn: TermsIndexPatternColumn = {
        operationId: 'op1',
        label: 'Top value of category',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        params: {
          orderBy: { type: 'column', columnId: 'col1' },
          size: 5,
          orderDirection: 'asc',
        },
        sourceField: 'category',
      };
      const updatedColumn = termsOperation.onOtherColumnChanged!(initialColumn, {
        col1: {
          operationId: 'op1',
          label: 'Count',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'count',
        },
      });
      expect(updatedColumn).toBe(initialColumn);
    });

    it('should switch to alphabetical ordering if the order column is removed', () => {
      const termsColumn = termsOperation.onOtherColumnChanged!(
        {
          operationId: 'op1',
          label: 'Top value of category',
          dataType: 'string',
          isBucketed: true,

          // Private
          operationType: 'terms',
          params: {
            orderBy: { type: 'column', columnId: 'col1' },
            size: 5,
            orderDirection: 'asc',
          },
          sourceField: 'category',
        },
        {}
      );
      expect(termsColumn.params).toEqual(
        expect.objectContaining({
          orderBy: { type: 'alphabetical' },
        })
      );
    });

    it('should switch to alphabetical ordering if the order column is not a metric anymore', () => {
      const termsColumn = termsOperation.onOtherColumnChanged!(
        {
          operationId: 'op1',
          label: 'Top value of category',
          dataType: 'string',
          isBucketed: true,

          // Private
          operationType: 'terms',
          params: {
            orderBy: { type: 'column', columnId: 'col1' },
            size: 5,
            orderDirection: 'asc',
          },
          sourceField: 'category',
        },
        {
          col1: {
            operationId: 'op1',
            label: 'Value of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            params: {
              interval: 'w',
            },
            sourceField: 'timestamp',
          },
        }
      );
      expect(termsColumn.params).toEqual(
        expect.objectContaining({
          orderBy: { type: 'alphabetical' },
        })
      );
    });
  });

  describe('popover param editor', () => {
    it('should render current order by value and options', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      const select = instance.find('[data-test-subj="indexPattern-terms-orderBy"]').find(EuiSelect);

      expect(select.prop('value')).toEqual('alphabetical');

      expect(select.prop('options').map(({ value }) => value)).toEqual([
        'column$$$col2',
        'alphabetical',
      ]);
    });

    it('should update state with the order by value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      instance
        .find(EuiSelect)
        .find('[data-test-subj="indexPattern-terms-orderBy"]')
        .prop('onChange')!({
        target: {
          value: 'column$$$col2',
        },
      } as React.ChangeEvent<HTMLSelectElement>);

      expect(setStateSpy).toHaveBeenCalledWith({
        ...state,
        columns: {
          ...state.columns,
          col1: {
            ...state.columns.col1,
            params: {
              ...(state.columns.col1 as TermsIndexPatternColumn).params,
              orderBy: {
                type: 'column',
                columnId: 'col2',
              },
            },
          },
        },
      });
    });

    it('should render current order direction value and options', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      const select = instance
        .find('[data-test-subj="indexPattern-terms-orderDirection"]')
        .find(EuiSelect);

      expect(select.prop('value')).toEqual('asc');
      expect(select.prop('options').map(({ value }) => value)).toEqual(['asc', 'desc']);
    });

    it('should update state with the order direction value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      instance
        .find('[data-test-subj="indexPattern-terms-orderDirection"]')
        .find(EuiSelect)
        .prop('onChange')!({
        target: {
          value: 'desc',
        },
      } as React.ChangeEvent<HTMLSelectElement>);

      expect(setStateSpy).toHaveBeenCalledWith({
        ...state,
        columns: {
          ...state.columns,
          col1: {
            ...state.columns.col1,
            params: {
              ...(state.columns.col1 as TermsIndexPatternColumn).params,
              orderDirection: 'desc',
            },
          },
        },
      });
    });

    it('should render current size value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      expect(instance.find(EuiRange).prop('value')).toEqual(5);
    });

    it('should update state with the size value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      instance.find(EuiRange).prop('onChange')!({
        target: {
          value: '7',
        },
      } as React.ChangeEvent<HTMLInputElement>);
      expect(setStateSpy).toHaveBeenCalledWith({
        ...state,
        columns: {
          ...state.columns,
          col1: {
            ...state.columns.col1,
            params: {
              ...(state.columns.col1 as TermsIndexPatternColumn).params,
              size: 7,
            },
          },
        },
      });
    });
  });
});
