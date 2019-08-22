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
import { UiSettingsClientContract } from 'src/core/public';
import { Storage } from 'ui/storage';
import { createMockedIndexPattern } from '../mocks';

jest.mock('ui/new_platform');

describe('date_histogram', () => {
  let state: IndexPatternPrivateState;
  const InlineOptions = dateHistogramOperation.paramEditor!;

  beforeEach(() => {
    state = {
      currentIndexPatternId: '1',
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
        2: {
          id: '2',
          title: 'Mock Indexpattern 2',
          fields: [
            {
              name: 'other_timestamp',
              type: 'date',
              esTypes: ['date'],
              aggregatable: true,
              searchable: true,
            },
          ],
        },
      },
      layers: {
        first: {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
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
        },
        second: {
          indexPatternId: '2',
          columnOrder: ['col2'],
          columns: {
            col2: {
              label: 'Value of timestamp',
              dataType: 'date',
              isBucketed: true,

              // Private
              operationType: 'date_histogram',
              params: {
                interval: 'd',
              },
              sourceField: 'other_timestamp',
            },
          },
        },
      },
    };
  });

  describe('buildColumn', () => {
    it('should create column object with auto interval for primary time field', () => {
      const column = dateHistogramOperation.buildColumn({
        columns: {},
        suggestedPriority: 0,
        layerId: 'first',
        indexPattern: createMockedIndexPattern(),
        field: {
          name: 'timestamp',
          type: 'date',
          esTypes: ['date'],
          aggregatable: true,
          searchable: true,
        },
      });
      expect(column.params.interval).toEqual('auto');
    });

    it('should create column object with manual interval for non-primary time fields', () => {
      const column = dateHistogramOperation.buildColumn({
        columns: {},
        suggestedPriority: 0,
        layerId: 'first',
        indexPattern: createMockedIndexPattern(),
        field: {
          name: 'start_date',
          type: 'date',
          esTypes: ['date'],
          aggregatable: true,
          searchable: true,
        },
      });
      expect(column.params.interval).toEqual('d');
    });

    it('should create column object with restrictions', () => {
      const column = dateHistogramOperation.buildColumn({
        columns: {},
        suggestedPriority: 0,
        layerId: 'first',
        indexPattern: createMockedIndexPattern(),
        field: {
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
        },
      });
      expect(column.params.interval).toEqual('1y');
      expect(column.params.timeZone).toEqual('UTC');
    });
  });

  describe('toEsAggsConfig', () => {
    it('should reflect params correctly', () => {
      const esAggsConfig = dateHistogramOperation.toEsAggsConfig(
        state.layers.first.columns.col1 as DateHistogramIndexPatternColumn,
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

  describe('transfer', () => {
    it('should adjust interval and time zone params if that is necessary due to restrictions', () => {
      const transferedColumn = dateHistogramOperation.transfer!(
        {
          dataType: 'date',
          isBucketed: true,
          label: '',
          operationType: 'date_histogram',
          sourceField: 'dateField',
          params: {
            interval: 'd',
          },
        },
        {
          title: '',
          id: '',
          fields: [
            {
              name: 'dateField',
              type: 'date',
              aggregatable: true,
              searchable: true,
              aggregationRestrictions: {
                date_histogram: {
                  agg: 'date_histogram',
                  time_zone: 'CET',
                  calendar_interval: 'w',
                },
              },
            },
          ],
        }
      );
      expect(transferedColumn).toEqual(
        expect.objectContaining({
          params: {
            interval: 'w',
            timeZone: 'CET',
          },
        })
      );
    });

    it('should remove time zone param and normalize interval param', () => {
      const transferedColumn = dateHistogramOperation.transfer!(
        {
          dataType: 'date',
          isBucketed: true,
          label: '',
          operationType: 'date_histogram',
          sourceField: 'dateField',
          params: {
            interval: '20s',
          },
        },
        {
          title: '',
          id: '',
          fields: [
            {
              name: 'dateField',
              type: 'date',
              aggregatable: true,
              searchable: true,
            },
          ],
        }
      );
      expect(transferedColumn).toEqual(
        expect.objectContaining({
          params: {
            interval: 'M',
            timeZone: undefined,
          },
        })
      );
    });
  });

  describe('param editor', () => {
    it('should render current value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          state={state}
          setState={setStateSpy}
          columnId="col1"
          layerId="first"
          storage={{} as Storage}
          uiSettings={{} as UiSettingsClientContract}
        />
      );

      expect(instance.find(EuiRange).prop('value')).toEqual(1);
    });

    it('should render current value for other index pattern', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          state={state}
          setState={setStateSpy}
          columnId="col2"
          layerId="second"
          storage={{} as Storage}
          uiSettings={{} as UiSettingsClientContract}
        />
      );

      expect(instance.find(EuiRange).prop('value')).toEqual(2);
    });

    it('should update state with the interval value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          state={state}
          setState={setStateSpy}
          columnId="col1"
          layerId="first"
          storage={{} as Storage}
          uiSettings={{} as UiSettingsClientContract}
        />
      );

      instance.find(EuiRange).prop('onChange')!({
        target: {
          value: '2',
        },
      } as React.ChangeEvent<HTMLInputElement>);
      expect(setStateSpy).toHaveBeenCalledWith({
        ...state,
        layers: {
          ...state.layers,
          first: {
            ...state.layers.first,
            columns: {
              ...state.layers.first.columns,
              col1: {
                ...state.layers.first.columns.col1,
                params: {
                  interval: 'd',
                },
              },
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
          layerId="first"
          storage={{} as Storage}
          uiSettings={{} as UiSettingsClientContract}
        />
      );

      expect(instance.find(EuiRange)).toHaveLength(0);
    });
  });
});
