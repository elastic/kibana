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
import { Storage } from 'ui/storage';
import { DataPluginDependencies } from '../plugin';

describe('filter_ratio', () => {
  let state: IndexPatternPrivateState;
  let storageMock: Storage;
  let mockedDependencies: DataPluginDependencies;
  const InlineOptions = filterRatioOperation.paramEditor!;

  class MockQueryBarInput {
    props: {};
    constructor(props: {}) {
      this.props = props;
    }
    render() {
      return <></>;
    }
  }

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
      layers: {
        first: {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
              label: 'Filter Ratio',
              dataType: 'number',
              isBucketed: false,

              // Private
              operationType: 'filter_ratio',
              params: {
                numerator: { query: '', language: 'kuery' },
                denominator: { query: '', language: 'kuery' },
              },
            },
          },
        },
      },
    };

    storageMock = {} as Storage;
    mockedDependencies = ({
      components: { QueryBarInput: MockQueryBarInput },
    } as unknown) as DataPluginDependencies;
  });

  describe('buildColumn', () => {
    it('should create column object with default params', () => {
      const column = filterRatioOperation.buildColumn({
        layerId: 'first',
        columns: {},
        suggestedPriority: undefined,
      });
      expect(column.params.numerator).toEqual({ query: '', language: 'kuery' });
      expect(column.params.denominator).toEqual({ query: '', language: 'kuery' });
    });
  });

  describe('toEsAggsConfig', () => {
    it('should reflect params correctly', () => {
      const esAggsConfig = filterRatioOperation.toEsAggsConfig(
        state.layers.first.columns.col1 as FilterRatioIndexPatternColumn,
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
                input: { query: '', language: 'kuery' },
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
            layerId="first"
            state={state}
            setState={jest.fn()}
            columnId="col1"
            storage={storageMock}
            dataPluginDependencies={mockedDependencies}
          />
        );
      }).not.toThrow();
    });

    it('should show only the numerator by default', () => {
      const wrapper = shallowWithIntl(
        <InlineOptions
          layerId="first"
          state={state}
          setState={jest.fn()}
          columnId="col1"
          storage={storageMock}
          dataPluginDependencies={mockedDependencies}
        />
      );

      expect(wrapper.find(MockQueryBarInput)).toHaveLength(1);
      expect(wrapper.find(MockQueryBarInput).prop('indexPatterns')).toEqual(['Mock Indexpattern']);
    });

    it('should update the state when typing into the query bar', () => {
      const setState = jest.fn();
      const wrapper = shallowWithIntl(
        <InlineOptions
          layerId="first"
          state={state}
          setState={setState}
          columnId="col1"
          storage={storageMock}
          dataPluginDependencies={mockedDependencies}
        />
      );

      wrapper.find(MockQueryBarInput).prop('onChange')!({
        query: 'geo.src : "US"',
        language: 'kuery',
      });

      expect(setState).toHaveBeenCalledWith({
        ...state,
        layers: {
          ...state.layers,
          first: {
            ...state.layers.first,
            columns: {
              col1: {
                ...state.layers.first.columns.col1,
                params: {
                  numerator: { query: 'geo.src : "US"', language: 'kuery' },
                  denominator: { query: '', language: 'kuery' },
                },
              },
            },
          },
        },
      });
    });

    it('should allow editing the denominator', () => {
      const setState = jest.fn();
      const wrapper = shallowWithIntl(
        <InlineOptions
          layerId="first"
          state={state}
          setState={setState}
          columnId="col1"
          storage={storageMock}
          dataPluginDependencies={mockedDependencies}
        />
      );

      act(() => {
        wrapper
          .find('[data-test-subj="lns-indexPatternFilterRatio-showDenominatorButton"]')
          .first()
          .simulate('click');
      });

      expect(wrapper.find(MockQueryBarInput)).toHaveLength(2);

      wrapper
        .find(MockQueryBarInput)
        .at(1)
        .prop('onChange')!({
        query: 'geo.src : "US"',
        language: 'kuery',
      });

      expect(setState).toHaveBeenCalledWith({
        ...state,
        layers: {
          ...state.layers,
          first: {
            ...state.layers.first,
            columns: {
              col1: {
                ...state.layers.first.columns.col1,
                params: {
                  numerator: { query: '', language: 'kuery' },
                  denominator: { query: 'geo.src : "US"', language: 'kuery' },
                },
              },
            },
          },
        },
      });
    });
  });
});
