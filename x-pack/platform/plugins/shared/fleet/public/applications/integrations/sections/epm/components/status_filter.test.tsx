/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';

import {
  STATUS_DEPRECATED,
  type IntegrationStatusFilterType,
} from '../screens/browse_integrations/types';

import { StatusFilter } from './status_filter';

describe('StatusFilter', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function renderStatusFilter(props = {}) {
    const defaultProps = {
      selectedStatuses: [] as IntegrationStatusFilterType[],
      onChange: mockOnChange,
      testSubjPrefix: 'test',
      popoverId: 'testPopover',
      ...props,
    };
    return render(
      <I18nProvider>
        <EuiThemeProvider>
          <StatusFilter {...defaultProps} />
        </EuiThemeProvider>
      </I18nProvider>
    );
  }

  it('renders the status filter button', () => {
    const { getByTestId } = renderStatusFilter();
    expect(getByTestId('test.statusBtn')).toBeInTheDocument();
  });

  it('opens popover when button is clicked', () => {
    const { getByTestId } = renderStatusFilter();
    const button = getByTestId('test.statusBtn');

    fireEvent.click(button);

    expect(getByTestId('test.statusSelectableList')).toBeInTheDocument();
  });

  it('displays deprecated option', () => {
    const { getByTestId, getByText } = renderStatusFilter();

    fireEvent.click(getByTestId('test.statusBtn'));

    expect(getByText('Deprecated integrations')).toBeInTheDocument();
  });

  it('shows active filter count when deprecated is selected', () => {
    const { getByTestId, container } = renderStatusFilter({
      selectedStatuses: [STATUS_DEPRECATED],
    });
    const button = getByTestId('test.statusBtn');

    expect(button).toHaveClass('euiFilterButton-hasActiveFilters');

    const badge = container.querySelector('.euiNotificationBadge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('1');
  });

  it('calls onChange with STATUS_DEPRECATED when deprecated option is checked', async () => {
    const { getByTestId } = renderStatusFilter();

    fireEvent.click(getByTestId('test.statusBtn'));

    const deprecatedOption = getByTestId('test.statusDeprecatedOption');
    fireEvent.click(deprecatedOption);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([STATUS_DEPRECATED]);
    });
  });

  it('calls onChange with empty array when unchecking the last status', async () => {
    const { getByTestId } = renderStatusFilter({ selectedStatuses: [STATUS_DEPRECATED] });

    fireEvent.click(getByTestId('test.statusBtn'));

    const deprecatedOption = getByTestId('test.statusDeprecatedOption');

    fireEvent.click(deprecatedOption);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });
});
