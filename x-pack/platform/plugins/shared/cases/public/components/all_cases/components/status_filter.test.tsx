/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseStatuses } from '../../../../common/types/domain';
import { getBuiltInStatuses } from '../../../../common/utils/statuses';
import { renderWithTestingProviders } from '../../../common/mock';
import { useCaseStatuses } from '../../status/use_case_statuses';
import { StatusFilter } from './status_filter';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import * as i18n from '../translations';

jest.mock('../../status/use_case_statuses');

const LABELS = {
  closed: i18n.STATUS_CLOSED,
  open: i18n.STATUS_OPEN,
  inProgress: i18n.STATUS_IN_PROGRESS,
};

const awaitingCustomer = {
  key: 'awaiting_customer',
  label: 'Awaiting customer',
  category: CaseStatuses['in-progress'],
  order: 3,
  isDefault: false,
  disabled: false,
};

const mockStatuses = (enabledStatuses = getBuiltInStatuses(), isCustomStatusesEnabled = false) => {
  (useCaseStatuses as jest.Mock).mockReturnValue({
    statuses: enabledStatuses,
    enabledStatuses,
    isCustomStatusesEnabled,
    isLoading: false,
  });
};

describe('StatusFilter', () => {
  const onChange = jest.fn();
  const defaultProps = {
    selectedOptionKeys: [],
    countClosedCases: 7,
    countInProgressCases: 5,
    countOpenCases: 2,
    onChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStatuses();
  });

  it('should render', async () => {
    renderWithTestingProviders(<StatusFilter {...defaultProps} />);

    expect(await screen.findByTestId('options-filter-popover-button-status')).not.toBeDisabled();

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));

    await waitForEuiPopoverOpen();

    const options = await screen.findAllByRole('option');

    expect(options.length).toBe(3);
    expect(options[0]).toHaveTextContent(LABELS.open);
    expect(options[1]).toHaveTextContent(LABELS.inProgress);
    expect(options[2]).toHaveTextContent(LABELS.closed);
  });

  it('should call onStatusChanged when changing status to open', async () => {
    renderWithTestingProviders(<StatusFilter {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
    await waitForEuiPopoverOpen();
    await userEvent.click(await screen.findByRole('option', { name: LABELS.open }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        filterId: 'status',
        selectedOptionKeys: [CaseStatuses.open],
      });
    });
  });

  it('should not render hidden statuses', async () => {
    renderWithTestingProviders(
      <StatusFilter {...defaultProps} hiddenStatuses={[CaseStatuses.closed]} />
    );

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));

    await waitForEuiPopoverOpen();

    const options = await screen.findAllByRole('option');

    expect(options.length).toBe(2);
    expect(options[0]).toHaveTextContent(LABELS.open);
    expect(options[1]).toHaveTextContent(LABELS.inProgress);
  });

  describe('custom statuses', () => {
    beforeEach(() => {
      mockStatuses([...getBuiltInStatuses(), awaitingCustomer], true);
    });

    it('groups the configured statuses under their category with its count', async () => {
      renderWithTestingProviders(
        <StatusFilter
          {...defaultProps}
          hiddenStatuses={[CaseStatuses.closed]}
          selectedStatusKeys={['awaiting_customer']}
        />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();

      expect(screen.getByText(`${LABELS.open} (2)`)).toBeInTheDocument();
      expect(screen.getByText(`${LABELS.inProgress} (5)`)).toBeInTheDocument();
      expect(screen.queryByText(`${LABELS.closed} (7)`)).not.toBeInTheDocument();

      const options = await screen.findAllByRole('option');
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent(LABELS.open);
      expect(options[1]).toHaveTextContent(LABELS.inProgress);
      expect(options[2]).toHaveTextContent('Awaiting customer');
      expect(options[2]).toBeChecked();
    });

    it('groups statuses that pause time tracking under Paused with the paused count', async () => {
      mockStatuses(
        [...getBuiltInStatuses(), { ...awaitingCustomer, pausesTimeTracking: true }],
        true
      );
      renderWithTestingProviders(<StatusFilter {...defaultProps} countPausedCases={3} />);

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();

      expect(screen.getByText(`${i18n.STATUS_PAUSED} (3)`)).toBeInTheDocument();

      const options = await screen.findAllByRole('option');
      expect(options).toHaveLength(4);
      expect(options[3]).toHaveTextContent('Awaiting customer');
    });

    it('reports the selection as status keys', async () => {
      renderWithTestingProviders(<StatusFilter {...defaultProps} />);

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();
      await userEvent.click(await screen.findByRole('option', { name: 'Awaiting customer' }));

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          filterId: 'statusKey',
          selectedOptionKeys: ['awaiting_customer'],
        });
      });
    });
  });
});
