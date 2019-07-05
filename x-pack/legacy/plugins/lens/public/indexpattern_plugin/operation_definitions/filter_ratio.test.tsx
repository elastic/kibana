/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { act } from 'react-dom/test-utils';
import { filterRatioOperation } from './filter_ratio';
import { FilterRatioIndexPatternColumn, IndexPatternPrivateState } from '../indexpattern';

describe('filter_ratio', () => {
  let state: IndexPatternPrivateState;
  let storageMock: any;
  let dataMock: any;
  const InlineOptions = filterRatioOperation.paramEditor!;

  beforeEach(() => {
    state = {
      indexPatterns: {
        1: {
          id: '1',
          title: 'Mock Indexpattern',
          fields: [],
        },
      },
      currentIndexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          operationId: 'op1',
          label: 'Filter Ratio',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'filter_ratio',
          params: {
            numerator: { query: '', language: 'kuery' },
            denominator: { query: '*', language: 'kuery' },
          },
        },
      },
    };

    class QueryBarInput {
      props: any;
      constructor(props: any) {
        this.props = props;
      }
      render() {
        return <></>;
      }
    }

    storageMock = {
      getItem() {},
    };
    dataMock = {
      query: { ui: { QueryBarInput } },
    };
  });

  describe('buildColumn', () => {
    it('should create column object with default params', () => {
      const column = filterRatioOperation.buildColumn('op', 0);
      expect(column.params.numerator).toEqual({ query: '', language: 'kuery' });
      expect(column.params.denominator).toEqual({ query: '*', language: 'kuery' });
    });
  });

  describe('toEsAggsConfig', () => {
    it('should reflect params correctly', () => {
      const esAggsConfig = filterRatioOperation.toEsAggsConfig(
        state.columns.col1 as FilterRatioIndexPatternColumn,
        'col1'
      );
      expect(esAggsConfig).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            filters: [
              {
                input: { query: '', language: 'kuery' },
                label: '',
              },
              {
                input: { query: '*', language: 'kuery' },
                label: '',
              },
            ],
          }),
        })
      );
    });
  });

  describe('param editor', () => {
    it('should render current value', () => {
      expect(() => {
        shallowWithIntl(
          <InlineOptions
            state={state}
            setState={jest.fn()}
            columnId="col1"
            storage={storageMock}
            dataPlugin={dataMock}
          />
        );
      }).not.toThrow();
    });

    it('should show only the numerator by default', () => {
      const wrapper = shallowWithIntl(
        <InlineOptions
          state={state}
          setState={jest.fn()}
          columnId="col1"
          storage={storageMock}
          dataPlugin={dataMock}
        />
      );

      expect(wrapper.find('QueryBarInput')).toHaveLength(1);
      expect(wrapper.find('QueryBarInput').prop('indexPatterns')).toEqual(['1']);
    });

    it('should update the state when typing into the query bar', () => {
      const setState = jest.fn();
      const wrapper = shallowWithIntl(
        <InlineOptions
          state={state}
          setState={setState}
          columnId="col1"
          storage={storageMock}
          dataPlugin={dataMock}
        />
      );

      wrapper.find('QueryBarInput').prop('onChange')!({
        query: 'geo.src : "US"',
        language: 'kuery',
      } as any);

      expect(setState).toHaveBeenCalledWith({
        ...state,
        columns: {
          col1: {
            ...state.columns.col1,
            params: {
              numerator: { query: 'geo.src : "US"', language: 'kuery' },
              denominator: { query: '*', language: 'kuery' },
            },
          },
        },
      });
    });

    it('should allow editing the denominator', () => {
      const setState = jest.fn();
      const wrapper = shallowWithIntl(
        <InlineOptions
          state={state}
          setState={setState}
          columnId="col1"
          storage={storageMock}
          dataPlugin={dataMock}
        />
      );

      act(() => {
        wrapper
          .find('[data-test-subj="lns-indexPatternFilterRatio-showDenominatorButton"]')
          .first()
          .simulate('click');
      });

      expect(wrapper.find('QueryBarInput')).toHaveLength(2);

      wrapper
        .find('QueryBarInput')
        .at(1)
        .prop('onChange')!({
        query: 'geo.src : "US"',
        language: 'kuery',
      } as any);

      expect(setState).toHaveBeenCalledWith({
        ...state,
        columns: {
          col1: {
            ...state.columns.col1,
            params: {
              numerator: { query: '', language: 'kuery' },
              denominator: { query: 'geo.src : "US"', language: 'kuery' },
            },
          },
        },
      });
    });
  });
});
