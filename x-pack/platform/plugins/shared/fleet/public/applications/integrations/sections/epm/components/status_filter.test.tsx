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
  STATUS_BETA,
  STATUS_DEPRECATED,
  type IntegrationStatusFilterType,
} from '../screens/browse_integrations/types';

import { StatusFilter } from './status_filter';

const mockUseAuthz = jest.fn();
const mockUseStartServices = jest.fn();
const mockUsePutSettingsMutation = jest.fn();

jest.mock('../../../hooks', () => ({
  useAuthz: () => mockUseAuthz(),
  useStartServices: () => mockUseStartServices(),
  usePutSettingsMutation: () => mockUsePutSettingsMutation(),
}));

describe('StatusFilter', () => {
  const mockOnChange = jest.fn();
  const mockMutateAsync = jest.fn();
  const mockToasts = {
    addError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthz.mockReturnValue({
      fleet: { allSettings: true },
    });
    mockUseStartServices.mockReturnValue({
      notifications: { toasts: mockToasts },
    });
    mockUsePutSettingsMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
    });
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

  it('displays both beta and deprecated options', () => {
    const { getByTestId, getByText } = renderStatusFilter();

    fireEvent.click(getByTestId('test.statusBtn'));

    expect(getByText('Beta integrations')).toBeInTheDocument();
    expect(getByText('Deprecated integrations')).toBeInTheDocument();
  });

  it('hides beta option when user lacks permissions', () => {
    mockUseAuthz.mockReturnValue({
      fleet: { allSettings: false },
    });

    const { getByTestId, getByText } = renderStatusFilter();

    fireEvent.click(getByTestId('test.statusBtn'));

    // EuiSelectable renders hidden items in DOM with hidden="" attribute
    const betaOption = getByTestId('test.statusBetaOption');
    expect(betaOption).toHaveAttribute('hidden', '');
    expect(getByText('Deprecated integrations')).toBeInTheDocument();
  });

  it('shows active filter count when beta is selected', () => {
    const { getByTestId, container } = renderStatusFilter({ selectedStatuses: ['beta'] });
    const button = getByTestId('test.statusBtn');

    expect(button).toHaveClass('euiFilterButton-hasActiveFilters');

    const badge = container.querySelector('.euiNotificationBadge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('1');
  });

  it('shows active filter count when deprecated is selected', () => {
    const { getByTestId, container } = renderStatusFilter({ selectedStatuses: ['deprecated'] });
    const button = getByTestId('test.statusBtn');

    expect(button).toHaveClass('euiFilterButton-hasActiveFilters');

    const badge = container.querySelector('.euiNotificationBadge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('1');
  });

  it('shows active filter count when both are selected', () => {
    const { getByTestId, container } = renderStatusFilter({
      selectedStatuses: [STATUS_BETA, STATUS_DEPRECATED],
    });
    const button = getByTestId('test.statusBtn');

    expect(button).toHaveClass('euiFilterButton-hasActiveFilters');

    const badge = container.querySelector('.euiNotificationBadge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('2');
  });

  it('calls onChange with STATUS_BETA when beta option is checked', async () => {
    mockMutateAsync.mockResolvedValue({ error: null });
    const { getByTestId } = renderStatusFilter();

    fireEvent.click(getByTestId('test.statusBtn'));

    const betaOption = getByTestId('test.statusBetaOption');
    fireEvent.click(betaOption);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([STATUS_BETA]);
    });
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

  it('calls onChange with empty array when unchecking beta option', async () => {
    mockMutateAsync.mockResolvedValue({ error: null });
    const { getByTestId } = renderStatusFilter({ selectedStatuses: [STATUS_BETA] });

    fireEvent.click(getByTestId('test.statusBtn'));

    const betaOption = getByTestId('test.statusBetaOption');
    fireEvent.click(betaOption);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });

  it('updates server settings when beta option is toggled on', async () => {
    mockMutateAsync.mockResolvedValue({ error: null });
    const { getByTestId } = renderStatusFilter();

    fireEvent.click(getByTestId('test.statusBtn'));

    const betaOption = getByTestId('test.statusBetaOption');
    fireEvent.click(betaOption);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        prerelease_integrations_enabled: true,
      });
    });
  });

  it('shows error toast when server settings update fails', async () => {
    const error = new Error('Update failed');
    mockMutateAsync.mockRejectedValue(error);

    const { getByTestId } = renderStatusFilter();

    fireEvent.click(getByTestId('test.statusBtn'));

    const betaOption = getByTestId('test.statusBetaOption');
    fireEvent.click(betaOption);

    await waitFor(() => {
      expect(mockToasts.addError).toHaveBeenCalledWith(error, {
        title: 'Error updating settings',
      });
    });
  });

  it('does not update server settings when user lacks permissions', async () => {
    mockUseAuthz.mockReturnValue({
      fleet: { allSettings: false },
    });

    const { getByTestId } = renderStatusFilter();

    fireEvent.click(getByTestId('test.statusBtn'));

    const deprecatedOption = getByTestId('test.statusDeprecatedOption');
    fireEvent.click(deprecatedOption);

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('does not update beta settings when only deprecated filter is toggled', async () => {
    mockMutateAsync.mockResolvedValue({ error: null });
    const { getByTestId } = renderStatusFilter();

    fireEvent.click(getByTestId('test.statusBtn'));

    const deprecatedOption = getByTestId('test.statusDeprecatedOption');
    fireEvent.click(deprecatedOption);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([STATUS_DEPRECATED]);
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('updates beta settings to false when unchecking beta option', async () => {
    mockMutateAsync.mockResolvedValue({ error: null });
    const { getByTestId } = renderStatusFilter({ selectedStatuses: [STATUS_BETA] });

    fireEvent.click(getByTestId('test.statusBtn'));

    const betaOption = getByTestId('test.statusBetaOption');
    fireEvent.click(betaOption);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        prerelease_integrations_enabled: false,
      });
    });

    expect(mockOnChange).toHaveBeenCalledWith([]);
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
