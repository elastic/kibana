/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { act, render, fireEvent } from '@testing-library/react';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import {
  DatePickerContextProvider,
  type DatePickerDependencies,
} from '../hooks/use_date_picker_context';
import { FROZEN_TIER_PREFERENCE } from '../storage';

import { FullTimeRangeSelector } from './full_time_range_selector';

const mockDependencies = {
  notifications: {},
} as DatePickerDependencies;

jest.mock('../services/full_time_range_selector_service');

import { setFullTimeRange } from '../services/full_time_range_selector_service';

jest.mock('@kbn/ml-local-storage', () => {
  return {
    useStorage: jest.fn(() => 'exclude-frozen'),
  };
});

describe('FullTimeRangeSelector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const dataView = {
    id: '0844fc70-5ab5-11e9-935e-836737467b0f',
    fields: [],
    title: 'test-data-view',
    timeFieldName: '@timestamp',
  } as unknown as DataView;

  const query: QueryDslQueryContainer = {
    term: {
      region: 'us-east-1',
    },
  };

  const props = {
    dataView,
    query,
    disabled: false,
    frozenDataPreference: FROZEN_TIER_PREFERENCE.EXCLUDE,
    setFrozenDataPreference: jest.fn(),
    timefilter: {} as TimefilterContract,
    callback: jest.fn(),
  };

  it('calls setFullTimeRange on clicking button', async () => {
    // prepare
    (setFullTimeRange as jest.MockedFunction<any>).mockImplementationOnce(() => undefined);

    const { getByText } = render(
      <IntlProvider locale="en">
        <DatePickerContextProvider {...mockDependencies}>
          <FullTimeRangeSelector {...props} />
        </DatePickerContextProvider>
      </IntlProvider>
    );

    // act
    await act(async () => {
      fireEvent.click(getByText(/use full data/i));
    });

    // assert
    expect(setFullTimeRange).toHaveBeenCalled();

    // The callback should not have been called since `setFullTimeRange` returned undefined
    expect(props.callback).toHaveBeenCalledTimes(0);
  });

  it('calls setFullTimeRange and callback on clicking button', async () => {
    // prepare
    (setFullTimeRange as jest.MockedFunction<any>).mockImplementationOnce(() => ({
      success: true,
      start: { epoch: 1234, string: moment(1234).toISOString() },
      end: { epoch: 2345, string: moment(2345).toISOString() },
    }));

    const { getByText } = render(
      <IntlProvider locale="en">
        <DatePickerContextProvider {...mockDependencies}>
          <FullTimeRangeSelector {...props} />
        </DatePickerContextProvider>
      </IntlProvider>
    );

    // act
    await act(async () => {
      fireEvent.click(getByText(/use full data/i));
    });

    // assert
    expect(setFullTimeRange).toHaveBeenCalled();

    // The callback should have been called since `setFullTimeRange` returned a time range
    expect(props.callback).toHaveBeenCalledTimes(1);
    expect(props.callback).toHaveBeenCalledWith({
      end: {
        epoch: 2345,
        string: '1970-01-01T00:00:02.345Z',
      },
      start: {
        epoch: 1234,
        string: '1970-01-01T00:00:01.234Z',
      },
      success: true,
    });
  });
});
