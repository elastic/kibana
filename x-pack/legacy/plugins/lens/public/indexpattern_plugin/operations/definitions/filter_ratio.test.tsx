/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { act } from 'react-dom/test-utils';
import { FilterRatioIndexPatternColumn } from './filter_ratio';
import { filterRatioOperation } from '.';
import { Storage } from 'ui/storage';
import {
  UiSettingsClientContract,
  SavedObjectsClientContract,
  HttpServiceBase,
} from 'src/core/public';
import { QueryBarInput } from '../../../../../../../../src/legacy/core_plugins/data/public/query';
import { createMockedIndexPattern } from '../../mocks';
import { EuiFormRow } from '@elastic/eui';
import { IndexPatternPrivateState } from '../../types';

jest.mock('ui/new_platform');

describe('filter_ratio', () => {
  let state: IndexPatternPrivateState;
  let storageMock: Storage;
  const InlineOptions = filterRatioOperation.paramEditor!;

  beforeEach(() => {
    state = {
      indexPatternRefs: [],
      existingFields: {},
      indexPatterns: {
        1: {
          id: '1',
          title: 'Mock Indexpattern',
          fields: [],
        },
      },
      currentIndexPatternId: '1',
      showEmptyFields: false,
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
  });

  describe('buildColumn', () => {
    it('should create column object with default params', () => {
      const column = filterRatioOperation.buildColumn({
        layerId: 'first',
        columns: {},
        suggestedPriority: undefined,
        indexPattern: createMockedIndexPattern(),
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
            currentColumn={state.layers.first.columns.col1 as FilterRatioIndexPatternColumn}
            storage={storageMock}
            uiSettings={{} as UiSettingsClientContract}
            savedObjectsClient={{} as SavedObjectsClientContract}
            http={{} as HttpServiceBase}
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
          currentColumn={state.layers.first.columns.col1 as FilterRatioIndexPatternColumn}
          storage={storageMock}
          uiSettings={{} as UiSettingsClientContract}
          savedObjectsClient={{} as SavedObjectsClientContract}
          http={{} as HttpServiceBase}
        />
      );

      expect(wrapper.find(QueryBarInput)).toHaveLength(1);
      expect(wrapper.find(QueryBarInput).prop('indexPatterns')).toEqual(['Mock Indexpattern']);
    });

    it('should update the state when typing into the query bar', () => {
      const setState = jest.fn();
      const wrapper = shallowWithIntl(
        <InlineOptions
          layerId="first"
          state={state}
          setState={setState}
          columnId="col1"
          currentColumn={state.layers.first.columns.col1 as FilterRatioIndexPatternColumn}
          storage={storageMock}
          uiSettings={{} as UiSettingsClientContract}
          savedObjectsClient={{} as SavedObjectsClientContract}
          http={{} as HttpServiceBase}
        />
      );

      wrapper.find(QueryBarInput).prop('onChange')!({
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
          currentColumn={state.layers.first.columns.col1 as FilterRatioIndexPatternColumn}
          storage={storageMock}
          uiSettings={{} as UiSettingsClientContract}
          savedObjectsClient={{} as SavedObjectsClientContract}
          http={{} as HttpServiceBase}
        />
      );

      const formRow = wrapper
        .find('[data-test-subj="lns-indexPatternFilterRatio-dividedByRow"]')
        .find(EuiFormRow);
      const labelAppend = shallowWithIntl(formRow.prop('labelAppend') as ReactElement);

      act(() => {
        labelAppend
          .find('[data-test-subj="lns-indexPatternFilterRatio-showDenominatorButton"]')
          .first()
          .simulate('click');
      });

      expect(wrapper.find(QueryBarInput)).toHaveLength(2);

      wrapper
        .find(QueryBarInput)
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

  it('should allow removing a set denominator', () => {
    const setState = jest.fn();
    const currentColumn: FilterRatioIndexPatternColumn = {
      ...(state.layers.first.columns.col1 as FilterRatioIndexPatternColumn),
      params: {
        numerator: { query: 'a: 123', language: 'kuery' },
        denominator: { query: 'b: 123', language: 'kuery' },
      },
    };

    const wrapper = shallowWithIntl(
      <InlineOptions
        layerId="first"
        state={{
          ...state,
          layers: {
            first: {
              ...state.layers.first,
              columns: {
                col1: currentColumn,
              },
            },
          },
        }}
        setState={setState}
        columnId="col1"
        currentColumn={currentColumn}
        storage={storageMock}
        uiSettings={{} as UiSettingsClientContract}
        savedObjectsClient={{} as SavedObjectsClientContract}
        http={{} as HttpServiceBase}
      />
    );

    const formRow = wrapper
      .find('[data-test-subj="lns-indexPatternFilterRatio-dividedByRow"]')
      .find(EuiFormRow);
    const labelAppend = shallowWithIntl(formRow.prop('labelAppend') as ReactElement);

    act(() => {
      labelAppend
        .find('[data-test-subj="lns-indexPatternFilterRatio-hideDenominatorButton"]')
        .first()
        .simulate('click');
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
                numerator: { query: 'a: 123', language: 'kuery' },
                denominator: { query: '', language: 'kuery' },
              },
            },
          },
        },
      },
    });
  });
});
