/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DateHistogramIndexPatternColumn } from './date_histogram';
import { dateHistogramOperation } from '.';
import { shallow } from 'enzyme';
import { EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { createMockedIndexPattern } from '../../mocks';
import { IndexPatternPrivateState } from '../../types';

jest.mock(`ui/new_platform`, () => {
  // Due to the way we are handling shims in the NP migration, we need
  // to mock core here so that upstream services don't cause these
  // tests to fail. Ordinarly `jest.mock('ui/new_platform')` would be
  // sufficient, however we need to mock one of the `uiSettings` return
  // values for this suite, so we must manually assemble the mock.
  // Because babel hoists `jest` we must use an inline `require`
  // to ensure the mocks are available (`jest.doMock` doesn't
  // work in this case). This mock should be able to be replaced
  // altogether once Lens has migrated to the new platform.
  const {
    createUiNewPlatformMock,
  } = require('../../../../../../../../src/legacy/ui/public/new_platform/__mocks__/helpers'); // eslint-disable-line @typescript-eslint/no-var-requires
  // This is basically duplicating what would ordinarily happen in
  // `ui/new_platform/__mocks__`
  const { npSetup, npStart } = createUiNewPlatformMock();
  // Override the core mock provided by `ui/new_platform`
  npStart.core.uiSettings.get = (path: string) => {
    if (path === 'histogram:maxBars') {
      return 10;
    }
  };
  return {
    npSetup,
    npStart,
  };
});

const defaultOptions = {
  storage: {} as IStorageWrapper,
  uiSettings: {} as IUiSettingsClient,
  savedObjectsClient: {} as SavedObjectsClientContract,
  dateRange: {
    fromDate: 'now-1y',
    toDate: 'now',
  },
  http: {} as HttpSetup,
};

describe('date_histogram', () => {
  let state: IndexPatternPrivateState;
  const InlineOptions = dateHistogramOperation.paramEditor!;

  beforeEach(() => {
    state = {
      indexPatternRefs: [],
      existingFields: {},
      currentIndexPatternId: '1',
      showEmptyFields: false,
      indexPatterns: {
        1: {
          id: '1',
          title: 'Mock Indexpattern',
          timeFieldName: 'timestamp',
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
                interval: '42w',
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
        third: {
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
                interval: 'auto',
              },
              sourceField: 'timestamp',
            },
          },
        },
      },
    };
  });

  function stateWithInterval(interval: string) {
    return ({
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
                interval,
              },
            },
          },
        },
      },
    } as unknown) as IndexPatternPrivateState;
  }

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

    it('should create column object with auto interval for non-primary time fields', () => {
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
      expect(column.params.interval).toEqual('auto');
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
            interval: '42w',
            field: 'timestamp',
          }),
        })
      );
    });
  });

  describe('onFieldChange', () => {
    it('should change correctly without auto interval', () => {
      const oldColumn: DateHistogramIndexPatternColumn = {
        operationType: 'date_histogram',
        sourceField: 'timestamp',
        label: 'Date over timestamp',
        isBucketed: true,
        dataType: 'date',
        params: {
          interval: 'd',
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newDateField = indexPattern.fields.find(i => i.name === 'start_date')!;

      const column = dateHistogramOperation.onFieldChange(oldColumn, indexPattern, newDateField);
      expect(column).toHaveProperty('sourceField', 'start_date');
      expect(column).toHaveProperty('params.interval', 'd');
      expect(column.label).toContain('start_date');
    });

    it('should not change interval from auto when switching to a non primary time field', () => {
      const oldColumn: DateHistogramIndexPatternColumn = {
        operationType: 'date_histogram',
        sourceField: 'timestamp',
        label: 'Date over timestamp',
        isBucketed: true,
        dataType: 'date',
        params: {
          interval: 'auto',
        },
      };
      const indexPattern = createMockedIndexPattern();
      const newDateField = indexPattern.fields.find(i => i.name === 'start_date')!;

      const column = dateHistogramOperation.onFieldChange(oldColumn, indexPattern, newDateField);
      expect(column).toHaveProperty('sourceField', 'start_date');
      expect(column).toHaveProperty('params.interval', 'auto');
      expect(column.label).toContain('start_date');
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

    it('should retain interval', () => {
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
            interval: '20s',
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
          {...defaultOptions}
          state={state}
          setState={setStateSpy}
          columnId="col1"
          layerId="first"
          currentColumn={state.layers.first.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );

      expect(instance.find('[data-test-subj="lensDateHistogramValue"]').prop('value')).toEqual(42);
      expect(instance.find('[data-test-subj="lensDateHistogramUnit"]').prop('value')).toEqual('w');
    });

    it('should render current value for other index pattern', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          state={state}
          setState={setStateSpy}
          columnId="col2"
          currentColumn={state.layers.second.columns.col2 as DateHistogramIndexPatternColumn}
          layerId="second"
        />
      );

      expect(instance.find('[data-test-subj="lensDateHistogramValue"]').prop('value')).toEqual('');
      expect(instance.find('[data-test-subj="lensDateHistogramUnit"]').prop('value')).toEqual('d');
    });

    it('should render disabled switch and no time interval control for auto interval', () => {
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          state={state}
          setState={jest.fn()}
          columnId="col1"
          currentColumn={state.layers.third.columns.col1 as DateHistogramIndexPatternColumn}
          layerId="third"
        />
      );
      expect(instance.find('[data-test-subj="lensDateHistogramValue"]').exists()).toBeFalsy();
      expect(instance.find('[data-test-subj="lensDateHistogramUnit"]').exists()).toBeFalsy();
      expect(instance.find(EuiSwitch).prop('checked')).toBe(false);
    });

    it('should allow switching to manual interval', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          state={state}
          setState={setStateSpy}
          columnId="col1"
          layerId="third"
          currentColumn={state.layers.third.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      instance.find(EuiSwitch).prop('onChange')!({
        target: { checked: true },
      } as EuiSwitchEvent);
      expect(setStateSpy).toHaveBeenCalled();
      const newState = setStateSpy.mock.calls[0][0];
      expect(newState).toHaveProperty('layers.third.columns.col1.params.interval', '30d');
    });

    it('should force calendar values to 1', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          state={state}
          setState={setStateSpy}
          columnId="col1"
          layerId="first"
          currentColumn={state.layers.first.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      instance.find('[data-test-subj="lensDateHistogramValue"]').prop('onChange')!({
        target: {
          value: '2',
        },
      } as React.ChangeEvent<HTMLInputElement>);
      expect(setStateSpy).toHaveBeenCalledWith(stateWithInterval('1w'));
    });

    it('should display error if an invalid interval is specified', () => {
      const setStateSpy = jest.fn();
      const testState = stateWithInterval('4quid');
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          state={testState}
          setState={setStateSpy}
          columnId="col1"
          layerId="first"
          currentColumn={testState.layers.first.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      expect(instance.find('[data-test-subj="lensDateHistogramError"]').exists()).toBeTruthy();
    });

    it('should not display error if interval value is blank', () => {
      const setStateSpy = jest.fn();
      const testState = stateWithInterval('d');
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          state={testState}
          setState={setStateSpy}
          columnId="col1"
          layerId="first"
          currentColumn={testState.layers.first.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      expect(instance.find('[data-test-subj="lensDateHistogramError"]').exists()).toBeFalsy();
    });

    it('should display error if interval value is 0', () => {
      const setStateSpy = jest.fn();
      const testState = stateWithInterval('0d');
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          state={testState}
          setState={setStateSpy}
          columnId="col1"
          layerId="first"
          currentColumn={testState.layers.first.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      expect(instance.find('[data-test-subj="lensDateHistogramError"]').exists()).toBeTruthy();
    });

    it('should update the unit', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          state={state}
          setState={setStateSpy}
          columnId="col1"
          layerId="first"
          currentColumn={state.layers.first.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      instance.find('[data-test-subj="lensDateHistogramUnit"]').prop('onChange')!({
        target: {
          value: 'd',
        },
      } as React.ChangeEvent<HTMLInputElement>);
      expect(setStateSpy).toHaveBeenCalledWith(stateWithInterval('42d'));
    });

    it('should update the value', () => {
      const setStateSpy = jest.fn();
      const testState = stateWithInterval('42d');

      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
          state={testState}
          setState={setStateSpy}
          columnId="col1"
          layerId="first"
          currentColumn={testState.layers.first.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );
      instance.find('[data-test-subj="lensDateHistogramValue"]').prop('onChange')!({
        target: {
          value: '9',
        },
      } as React.ChangeEvent<HTMLInputElement>);
      expect(setStateSpy).toHaveBeenCalledWith(stateWithInterval('9d'));
    });

    it('should not render options if they are restricted', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions
          {...defaultOptions}
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
          currentColumn={state.layers.first.columns.col1 as DateHistogramIndexPatternColumn}
        />
      );

      expect(instance.find('[data-test-subj="lensDateHistogramValue"]').exists()).toBeFalsy();
    });
  });
});
