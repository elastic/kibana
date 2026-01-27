/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../common/mock';
import { DateRangeFilter } from './date_range_filter';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_FROM_DATE } from '../../containers/constants';
import { useRefreshCases } from './use_on_refresh_cases';
import { useGetEarliestCase } from './use_get_earliest_case';
import { basicCase } from '../../containers/mock';

jest.mock('./use_on_refresh_cases');
jest.mock('./use_get_earliest_case');

const mockRefreshCases = jest.fn();
const mockDeselectCases = jest.fn();
const mockOnFilterOptionsChange = jest.fn();

const defaultProps = {
  filterOptions: DEFAULT_FILTER_OPTIONS,
  onFilterOptionsChange: mockOnFilterOptionsChange,
  isLoading: false,
  deselectCases: mockDeselectCases,
};

const SHOW_DATES_BUTTON_TEST_SUBJ = 'superDatePickerShowDatesButton';
const QUICK_MENU_BUTTON_TEST_SUBJ = 'superDatePickerToggleQuickMenuButton';
const COMMONLY_USED_TODAY_TEST_SUBJ = 'superDatePickerCommonlyUsed_Today';
const REFRESH_BUTTON_TEST_SUBJ = 'superDatePickerApplyTimeButton';

describe('DateRangeFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRefreshCases as jest.Mock).mockReturnValue(mockRefreshCases);
    (useGetEarliestCase as jest.Mock).mockReturnValue({
      earliestCase: basicCase,
      isLoading: false,
    });
  });

  it('should render with default props', () => {
    renderWithTestingProviders(<DateRangeFilter {...defaultProps} />);
    expect(screen.getByTestId('date-range-filter')).toBeInTheDocument();
    expect(screen.getByTestId(SHOW_DATES_BUTTON_TEST_SUBJ)).toHaveTextContent('Last 30 days');
  });

  it('should call onFilterOptionsChange when time changes', async () => {
    renderWithTestingProviders(<DateRangeFilter {...defaultProps} />);

    const quickMenuButton = screen.getByTestId(QUICK_MENU_BUTTON_TEST_SUBJ);
    await userEvent.click(quickMenuButton);

    const todayButton = screen.getByTestId(COMMONLY_USED_TODAY_TEST_SUBJ);
    await userEvent.click(todayButton);

    expect(mockOnFilterOptionsChange).toHaveBeenCalledWith({
      from: 'now/d',
      to: 'now/d',
    });
  });

  it('should call deselectCases and refreshCases when refresh is triggered', async () => {
    renderWithTestingProviders(<DateRangeFilter {...defaultProps} />);

    const refreshButton = screen.getByTestId(REFRESH_BUTTON_TEST_SUBJ);
    await userEvent.click(refreshButton);

    expect(mockDeselectCases).toHaveBeenCalled();
    expect(mockRefreshCases).toHaveBeenCalled();
  });

  it('should call onFilterOptionsChange with earliest case date when show all cases is clicked', async () => {
    renderWithTestingProviders(<DateRangeFilter {...defaultProps} />);

    const quickMenuButton = screen.getByTestId(QUICK_MENU_BUTTON_TEST_SUBJ);
    await userEvent.click(quickMenuButton);

    expect(screen.getByTestId('show-all-cases-link')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('show-all-cases-link'));

    expect(mockOnFilterOptionsChange).toHaveBeenCalledWith({
      from: basicCase.createdAt,
      to: 'now',
    });
  });

  it('should call onFilterOptionsChange with last 30 days when last 30 days is clicked', async () => {
    renderWithTestingProviders(<DateRangeFilter {...defaultProps} />);

    const quickMenuButton = screen.getByTestId(QUICK_MENU_BUTTON_TEST_SUBJ);
    await userEvent.click(quickMenuButton);

    expect(screen.getByTestId('last-30-days-link')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('last-30-days-link'));

    expect(mockOnFilterOptionsChange).toHaveBeenCalledWith({
      from: 'now-30d',
      to: 'now',
    });
  });

  it('should use DEFAULT_FROM_DATE when earliest case is not available and show all cases is clicked', async () => {
    (useGetEarliestCase as jest.Mock).mockReturnValue({
      earliestCase: undefined,
      isLoading: false,
    });
    renderWithTestingProviders(<DateRangeFilter {...defaultProps} />);

    const quickMenuButton = screen.getByTestId(QUICK_MENU_BUTTON_TEST_SUBJ);
    await userEvent.click(quickMenuButton);

    expect(screen.getByTestId('show-all-cases-link')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('show-all-cases-link'));
    expect(mockOnFilterOptionsChange).toHaveBeenCalledWith({
      from: DEFAULT_FROM_DATE,
      to: 'now',
    });
  });
});
