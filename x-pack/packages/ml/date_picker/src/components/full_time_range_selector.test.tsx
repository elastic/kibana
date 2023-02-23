/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

import type { Query } from '@kbn/es-query';
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

// Create a mock for the setFullTimeRange function in the service.
// The mock is hoisted to the top, so need to prefix the mock function
// with 'mock' so it can be used lazily.
const mockSetFullTimeRange = jest.fn((indexPattern: DataView, query: Query) => true);
jest.mock('../services/full_time_range_selector_service', () => ({
  setFullTimeRange: (indexPattern: DataView, query: Query) =>
    mockSetFullTimeRange(indexPattern, query),
}));

jest.mock('@kbn/ml-local-storage', () => {
  return {
    useStorage: jest.fn(() => 'exclude-frozen'),
  };
});

describe('FullTimeRangeSelector', () => {
  const dataView = {
    id: '0844fc70-5ab5-11e9-935e-836737467b0f',
    fields: [],
    title: 'test-data-view',
    timeFieldName: '@timestamp',
  } as unknown as DataView;

  const query: Query = {
    language: 'kuery',
    query: 'region:us-east-1',
  };

  const requiredProps = {
    dataView,
    query,
  };

  test('calls setFullTimeRange on clicking button', () => {
    const props = {
      ...requiredProps,
      disabled: false,
      frozenDataPreference: FROZEN_TIER_PREFERENCE.EXCLUDE,
      setFrozenDataPreference: jest.fn(),
      timefilter: {} as TimefilterContract,
    };

    const { getByText } = render(
      <IntlProvider locale="en">
        <DatePickerContextProvider {...mockDependencies}>
          <FullTimeRangeSelector {...props} />
        </DatePickerContextProvider>
      </IntlProvider>
    );

    fireEvent.click(getByText(/use full data/i));

    expect(mockSetFullTimeRange).toHaveBeenCalled();
  });
});
