/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TestProvider } from '../../../../common/test_utils';
import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { ChartsFilters, type ChartsFiltersProps } from './charts_filters';
import type { FilterName } from '../../hooks';
import { mockUseKibana } from '../../mocks';
import {
  METRIC_TYPE_VALUES,
  METRIC_TYPE_UI_OPTIONS_VALUES_TO_API_MAP,
} from '../../../../common/rest_types/usage_metrics';

const mockUseLocation = jest.fn(() => ({ pathname: '/' }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockUseLocation(),
  useHistory: jest.fn().mockReturnValue({
    push: jest.fn(),
    listen: jest.fn(),
    location: {
      search: '',
    },
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => mockUseKibana,
  };
});

describe('Charts Filters', () => {
  let user: UserEvent;
  const testId = 'test';
  const testIdFilter = `${testId}-filter`;
  const onClick = jest.fn();
  const dateRangePickerState = {
    startDate: 'now-15m',
    endDate: 'now',
    recentlyUsedDateRanges: [],
    autoRefreshOptions: {
      enabled: false,
      duration: 0,
    },
  };
  const defaultProps = {
    dateRangePickerState,
    isDataLoading: false,
    isUpdateDisabled: false,
    isValidDateRange: true,
    filterOptions: {
      dataStreams: {
        filterName: 'dataStreams' as FilterName,
        isFilterLoading: false,
        options: ['.ds-1', '.ds-2'],
        onChangeFilterOptions: jest.fn(),
      },
      metricTypes: {
        filterName: 'metricTypes' as FilterName,
        isFilterLoading: false,
        options: METRIC_TYPE_VALUES.slice(),
        onChangeFilterOptions: jest.fn(),
      },
    },
    onClick,
    onRefresh: jest.fn(),
    onRefreshChange: jest.fn(),
    onTimeChange: jest.fn(),
  };

  let renderComponent: (props: ChartsFiltersProps) => RenderResult;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    renderComponent = (props: ChartsFiltersProps) =>
      render(
        <TestProvider>
          <ChartsFilters data-test-subj={testIdFilter} {...props} />
        </TestProvider>
      );
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
  });

  it('renders data streams filter, date range filter and refresh button', () => {
    const { getByTestId } = renderComponent(defaultProps);
    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toBeTruthy();
    expect(getByTestId(`${testIdFilter}-date-range`)).toBeTruthy();
    expect(getByTestId(`${testIdFilter}-super-refresh-button`)).toBeTruthy();
  });

  it('renders metric filter', () => {
    const { getByTestId } = renderComponent({ ...defaultProps, showMetricsTypesFilter: true });
    expect(getByTestId(`${testIdFilter}-metricTypes-popoverButton`)).toBeTruthy();
    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toBeTruthy();
    expect(getByTestId(`${testIdFilter}-date-range`)).toBeTruthy();
    expect(getByTestId(`${testIdFilter}-super-refresh-button`)).toBeTruthy();
  });

  it('has default metrics selected if showing metrics filter', async () => {
    const { getByTestId, getAllByTestId } = renderComponent({
      ...defaultProps,
      showMetricsTypesFilter: true,
    });
    const metricsFilterButton = getByTestId(`${testIdFilter}-metricTypes-popoverButton`);
    expect(metricsFilterButton).toBeTruthy();
    await user.click(metricsFilterButton);
    const allFilterOptions = getAllByTestId('metricTypes-filter-option');

    // checked options
    const checkedOptions = allFilterOptions.filter(
      (option) => option.getAttribute('aria-checked') === 'true'
    );
    expect(checkedOptions).toHaveLength(2);
    expect(checkedOptions.map((option) => option.title)).toEqual(
      Object.keys(METRIC_TYPE_UI_OPTIONS_VALUES_TO_API_MAP).slice(0, 2)
    );

    // unchecked options
    const unCheckedOptions = allFilterOptions.filter(
      (option) => option.getAttribute('aria-checked') === 'false'
    );
    expect(unCheckedOptions).toHaveLength(7);
    expect(unCheckedOptions.map((option) => option.title)).toEqual(
      Object.keys(METRIC_TYPE_UI_OPTIONS_VALUES_TO_API_MAP).slice(2)
    );
  });

  it('should show invalid date range info', () => {
    const { getByTestId } = renderComponent({
      ...defaultProps,
      // using this prop to set invalid date range
      isValidDateRange: false,
    });
    expect(getByTestId(`${testIdFilter}-invalid-date-range`)).toBeTruthy();
  });

  it('should not show invalid date range info', () => {
    const { queryByTestId } = renderComponent(defaultProps);
    expect(queryByTestId(`${testIdFilter}-invalid-date-range`)).toBeNull();
  });

  it('should disable refresh button', () => {
    const { getByTestId } = renderComponent({
      ...defaultProps,
      isUpdateDisabled: true,
    });
    expect(getByTestId(`${testIdFilter}-super-refresh-button`)).toBeDisabled();
  });

  it('should show `updating` on refresh button', () => {
    const { getByTestId } = renderComponent({
      ...defaultProps,
      isDataLoading: true,
    });
    expect(getByTestId(`${testIdFilter}-super-refresh-button`)).toBeDisabled();
    expect(getByTestId(`${testIdFilter}-super-refresh-button`).textContent).toEqual('Updating');
  });

  it('should call onClick on refresh button click', () => {
    const { getByTestId } = renderComponent(defaultProps);
    getByTestId(`${testIdFilter}-super-refresh-button`).click();
    expect(onClick).toHaveBeenCalled();
  });
});
