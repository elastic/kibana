/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ListKiFilterButton, type ListKiFilterOption } from './list_ki_filter_button';

type TestFilterValue = 'active' | 'deleted';

const defaultOptions: Array<ListKiFilterOption<TestFilterValue>> = [
  {
    value: 'active',
    label: 'Active',
    checked: 'on',
    'data-test-subj': 'testFilterOption-active',
  },
  {
    value: 'deleted',
    label: 'Deleted',
    'data-test-subj': 'testFilterOption-deleted',
  },
];

const renderFilterButton = (
  onChange: jest.Mock,
  options: Array<ListKiFilterOption<TestFilterValue>> = defaultOptions
) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ListKiFilterButton
          buttonLabel="Status"
          legend="Filter by status"
          panelMinWidth="12rem"
          buttonMinWidth="7rem"
          options={options}
          hasActiveFilters
          numActiveFilters={1}
          onChange={onChange}
          buttonTestSubj="testFilterButton"
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('ListKiFilterButton', () => {
  it('opens the selectable list when the filter button is clicked', () => {
    renderFilterButton(jest.fn());

    expect(screen.queryByTestId('testFilterOption-deleted')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('testFilterButton'));
    expect(screen.getByTestId('testFilterOption-deleted')).toBeInTheDocument();
  });

  it('calls onChange with the selected value', () => {
    const onChange = jest.fn();
    renderFilterButton(onChange);

    fireEvent.click(screen.getByTestId('testFilterButton'));
    fireEvent.click(screen.getByTestId('testFilterOption-deleted'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('deleted');
  });

  it('does not call onChange when the popover is closed without picking an option', () => {
    const onChange = jest.fn();
    renderFilterButton(onChange);

    fireEvent.click(screen.getByTestId('testFilterButton'));
    fireEvent.click(screen.getByTestId('testFilterButton'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
