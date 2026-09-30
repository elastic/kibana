/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAX_CASE_STATUSES_PER_CATEGORY } from '../../../../common/constants';
import { CaseStatuses } from '../../../../common/types/domain';
import { getBuiltInStatuses } from '../../../../common/utils/statuses';
import { noCasesPermissions, renderWithTestingProviders } from '../../../common/mock';
import type { CaseStatusesSectionProps } from '.';
import { CaseStatusesSection } from '.';
import * as i18n from './translations';

const awaitingCustomer = {
  key: 'awaiting_customer',
  label: 'Awaiting customer',
  category: CaseStatuses['in-progress'],
  order: 3,
  isDefault: false,
  disabled: false,
};

describe('CaseStatusesSection', () => {
  const props: CaseStatusesSectionProps = {
    statuses: [...getBuiltInStatuses(), awaitingCustomer],
    disabled: false,
    isLoading: false,
    onAddStatus: jest.fn(),
    onEditStatus: jest.fn(),
    onMoveStatus: jest.fn(),
    onSetDefaultStatus: jest.fn(),
    onToggleStatusDisabled: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one group per category with its statuses and enabled count', () => {
    renderWithTestingProviders(<CaseStatusesSection {...props} />);

    const inProgress = screen.getByTestId('case-statuses-group-in-progress');
    expect(within(inProgress).getByText('Awaiting customer')).toBeInTheDocument();
    expect(within(inProgress).getByText(i18n.ENABLED_COUNT(2))).toBeInTheDocument();
    expect(screen.getAllByTestId(/^case-status-row-/)).toHaveLength(4);
  });

  it('marks the default and disabled statuses', () => {
    renderWithTestingProviders(
      <CaseStatusesSection
        {...props}
        statuses={[...getBuiltInStatuses(), { ...awaitingCustomer, disabled: true }]}
      />
    );

    expect(screen.getByTestId('case-status-in-progress-default-badge')).toBeInTheDocument();
    expect(screen.getByTestId('case-status-awaiting_customer-disabled-badge')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('case-statuses-group-in-progress')).getByText(i18n.ENABLED_COUNT(1))
    ).toBeInTheDocument();
  });

  it('adds a status under the group whose button was clicked', async () => {
    renderWithTestingProviders(<CaseStatusesSection {...props} />);

    await userEvent.click(screen.getByTestId('case-statuses-add-closed'));

    expect(props.onAddStatus).toHaveBeenCalledWith(CaseStatuses.closed);
  });

  it('shows the limit instead of the add button when a category is full', () => {
    const full = Array.from({ length: MAX_CASE_STATUSES_PER_CATEGORY - 1 }, (_, index) => ({
      ...awaitingCustomer,
      key: `status_${index}`,
      label: `Status ${index}`,
    }));

    renderWithTestingProviders(
      <CaseStatusesSection {...props} statuses={[...getBuiltInStatuses(), ...full]} />
    );

    expect(screen.queryByTestId('case-statuses-add-in-progress')).not.toBeInTheDocument();
    expect(screen.getByTestId('case-statuses-limit-in-progress')).toBeInTheDocument();
    expect(screen.getByTestId('case-statuses-add-open')).toBeInTheDocument();
  });

  describe('row actions', () => {
    it('does not allow disabling the default status or setting it as default again', async () => {
      renderWithTestingProviders(<CaseStatusesSection {...props} />);

      await userEvent.click(screen.getByTestId('case-status-in-progress-actions'));

      expect(screen.getByTestId('case-status-in-progress-disable')).toBeDisabled();
      expect(screen.getByTestId('case-status-in-progress-set-default')).toBeDisabled();
      expect(screen.queryByTestId('case-status-in-progress-move-up')).not.toBeInTheDocument();
      expect(screen.getByTestId('case-status-in-progress-move-down')).toBeInTheDocument();
    });

    it('lets a custom status be edited, made the default, moved, and disabled', async () => {
      renderWithTestingProviders(<CaseStatusesSection {...props} />);

      await userEvent.click(screen.getByTestId('case-status-awaiting_customer-actions'));
      await userEvent.click(screen.getByTestId('case-status-awaiting_customer-edit'));
      expect(props.onEditStatus).toHaveBeenCalledWith('awaiting_customer');

      await userEvent.click(screen.getByTestId('case-status-awaiting_customer-actions'));
      await userEvent.click(screen.getByTestId('case-status-awaiting_customer-set-default'));
      expect(props.onSetDefaultStatus).toHaveBeenCalledWith('awaiting_customer');

      await userEvent.click(screen.getByTestId('case-status-awaiting_customer-actions'));
      expect(
        screen.queryByTestId('case-status-awaiting_customer-move-down')
      ).not.toBeInTheDocument();
      await userEvent.click(screen.getByTestId('case-status-awaiting_customer-move-up'));
      expect(props.onMoveStatus).toHaveBeenCalledWith('awaiting_customer', 'up');

      await userEvent.click(screen.getByTestId('case-status-awaiting_customer-actions'));
      await userEvent.click(screen.getByTestId('case-status-awaiting_customer-disable'));
      expect(props.onToggleStatusDisabled).toHaveBeenCalledWith('awaiting_customer');
    });

    it('offers to enable a disabled status', async () => {
      renderWithTestingProviders(
        <CaseStatusesSection
          {...props}
          statuses={[...getBuiltInStatuses(), { ...awaitingCustomer, disabled: true }]}
        />
      );

      await userEvent.click(screen.getByTestId('case-status-awaiting_customer-actions'));
      await userEvent.click(screen.getByTestId('case-status-awaiting_customer-enable'));

      expect(props.onToggleStatusDisabled).toHaveBeenCalledWith('awaiting_customer');
    });

    it('disables every action while the configuration is saving', async () => {
      renderWithTestingProviders(<CaseStatusesSection {...props} disabled={true} />);

      expect(screen.getByTestId('case-status-awaiting_customer-actions')).toBeDisabled();
      expect(screen.getByTestId('case-statuses-add-open')).toBeDisabled();
    });
  });

  it('renders nothing without the settings privilege', () => {
    renderWithTestingProviders(<CaseStatusesSection {...props} />, {
      wrapperProps: { permissions: noCasesPermissions() },
    });

    expect(screen.queryByTestId('case-statuses')).not.toBeInTheDocument();
  });
});
