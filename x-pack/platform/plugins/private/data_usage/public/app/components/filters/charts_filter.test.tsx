/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import React from 'react';
import { TestProvider } from '../../../../common/test_utils';
import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { ChartsFilter, type ChartsFilterProps } from './charts_filter';
import type { FilterName } from '../../hooks';
import { mockUseKibana, generateDataStreams } from '../../mocks';

const mockUseLocation = vi.fn(() => ({ pathname: '/' }));
vi.mock('react-router-dom', () => {
      const mocked = {
      ...require('react-router-dom'),
      useLocation: () => mockUseLocation(),
      useHistory: vi.fn().mockReturnValue({
        push: vi.fn(),
        listen: vi.fn(),
        location: {
          search: '',
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/kibana-react-plugin/public', async () => {
  const original = (await vi.importActual('@kbn/kibana-react-plugin/public'));
  return {
    ...original,
    useKibana: () => mockUseKibana,
  };
});

describe('Charts Filters', () => {
  let user: UserEvent;
  const testId = 'test';
  const testIdFilter = `${testId}-filter`;

  const defaultProps = {
    filterOptions: {
      filterName: 'dataStreams' as FilterName,
      isFilterLoading: false,
      appendOptions: {},
      selectedOptions: [],
      options: generateDataStreams(8).map((ds) => ds.name),
      onChangeFilterOptions: vi.fn(),
    },
  };

  let renderComponent: (props: ChartsFilterProps) => RenderResult;

  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    renderComponent = (props: ChartsFilterProps) =>
      render(
        <TestProvider>
          <ChartsFilter data-test-subj={testIdFilter} {...props} />
        </TestProvider>
      );
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, pointerEventsCheck: 0 });
  });

  it('renders data streams filter with all options selected', async () => {
    const { getByTestId, getAllByTestId } = renderComponent(defaultProps);
    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toBeTruthy();

    const filterButton = getByTestId(`${testIdFilter}-dataStreams-popoverButton`);
    expect(filterButton).toBeTruthy();
    await user.click(filterButton);
    const allFilterOptions = getAllByTestId('dataStreams-filter-option');

    // checked options
    const checkedOptions = allFilterOptions.filter(
      (option) => option.getAttribute('aria-checked') === 'true'
    );
    expect(checkedOptions).toHaveLength(8);
  });

  it('renders data streams filter with 50 options selected when more than 50 items in the filter', async () => {
    const { getByTestId } = renderComponent({
      ...defaultProps,
      filterOptions: {
        ...defaultProps.filterOptions,
        options: generateDataStreams(55).map((ds) => ds.name),
      },
    });
    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toBeTruthy();

    const toggleFilterButton = getByTestId(`${testIdFilter}-dataStreams-popoverButton`);
    expect(toggleFilterButton).toBeTruthy();
    expect(toggleFilterButton).toHaveTextContent('Data streams50');
    expect(
      toggleFilterButton.querySelector('.euiNotificationBadge')?.getAttribute('aria-label')
    ).toBe('50 active filters');
  });

  it('renders data streams filter with no options selected and select all is disabled', async () => {
    const { getByTestId, queryByTestId } = renderComponent({
      ...defaultProps,
      filterOptions: {
        ...defaultProps.filterOptions,
        options: [],
      },
    });
    expect(getByTestId(`${testIdFilter}-dataStreams-popoverButton`)).toBeTruthy();

    const filterButton = getByTestId(`${testIdFilter}-dataStreams-popoverButton`);
    expect(filterButton).toBeTruthy();
    await user.click(filterButton);
    expect(queryByTestId('dataStreams-filter-option')).toBeFalsy();
    expect(getByTestId('dataStreams-group-label')).toBeTruthy();
    expect(getByTestId(`${testIdFilter}-dataStreams-selectAllButton`)).toBeDisabled();
  });
});
