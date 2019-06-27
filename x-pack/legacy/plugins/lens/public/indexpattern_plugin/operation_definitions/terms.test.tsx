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

  describe('popover param editor', () => {
    it('should render current value and options', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      expect(instance.find(EuiSelect).prop('value')).toEqual('alphabetical');
      expect(
        instance
          .find(EuiSelect)
          .prop('options')
          .map(({ value }) => value)
      ).toEqual(['column$$$col2', 'alphabetical']);
    });

    it('should update state with the order value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      instance.find(EuiSelect).prop('onChange')!({
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

    it('should render current value', () => {
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
