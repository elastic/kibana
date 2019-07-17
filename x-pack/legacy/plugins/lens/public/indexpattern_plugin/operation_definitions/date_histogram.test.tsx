/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { dateHistogramOperation } from './date_histogram';
import { shallow } from 'enzyme';
import { DateHistogramIndexPatternColumn, IndexPatternPrivateState } from '../indexpattern';
import { EuiRange } from '@elastic/eui';

describe('date_histogram', () => {
  let state: IndexPatternPrivateState;
  const InlineOptions = dateHistogramOperation.paramEditor!;

  beforeEach(() => {
    state = {
      indexPatterns: {
        1: {
          id: '1',
          title: 'Mock Indexpattern',
          fields: [
            {
              name: 'timestamp',
              type: 'date',
              esTypes: ['date'],
              aggregatable: true,
              searchable: true,
            },
          ],
        },
      },
      currentIndexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
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
      },
    };
  });

  describe('buildColumn', () => {
    it('should create column object with default params', () => {
      const column = dateHistogramOperation.buildColumn('op', {}, 0, {
        name: 'timestamp',
        type: 'date',
        esTypes: ['date'],
        aggregatable: true,
        searchable: true,
      });
      expect(column.params.interval).toEqual('h');
    });

    it('should create column object with restrictions', () => {
      const column = dateHistogramOperation.buildColumn('op', {}, 0, {
        name: 'timestamp',
        type: 'date',
        esTypes: ['date'],
        aggregatable: true,
        searchable: true,
        aggregationRestrictions: {
          date_histogram: {
            agg: 'date_histogram',
            time_zone: 'UTC',
            calendar_interval: '1y',
          },
        },
      });
      expect(column.params.interval).toEqual('1y');
      expect(column.params.timeZone).toEqual('UTC');
    });
  });

  describe('toEsAggsConfig', () => {
    it('should reflect params correctly', () => {
      const esAggsConfig = dateHistogramOperation.toEsAggsConfig(
        state.columns.col1 as DateHistogramIndexPatternColumn,
        'col1'
      );
      expect(esAggsConfig).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            interval: 'w',
            field: 'timestamp',
          }),
        })
      );
    });
  });

  describe('param editor', () => {
    it('should render current value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      expect(instance.find(EuiRange).prop('value')).toEqual(1);
    });

    it('should update state with the interval value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      instance.find(EuiRange).prop('onChange')!({
        target: {
          value: '2',
        },
      } as React.ChangeEvent<HTMLInputElement>);
      expect(setStateSpy).toHaveBeenCalledWith({
        ...state,
        columns: {
          ...state.columns,
          col1: {
            ...state.columns.col1,
            params: {
              interval: 'd',
            },
          },
        },
      });
    });

    it('should not render options if they are restricted', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          state={{
            ...state,
            indexPatterns: {
              1: {
                ...state.indexPatterns[1],
                fields: [
                  {
                    ...state.indexPatterns[1].fields[0],
                    aggregationRestrictions: {
                      date_histogram: {
                        agg: 'date_histogram',
                        time_zone: 'UTC',
                        calendar_interval: '1h',
                      },
                    },
                  },
                ],
              },
            },
          }}
          setState={setStateSpy}
          columnId="col1"
        />
      );

      expect(instance.find(EuiRange)).toHaveLength(0);
    });
  });
});
