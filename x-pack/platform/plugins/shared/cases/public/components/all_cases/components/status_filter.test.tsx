/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaseStatusDefinition } from '../../../../common/types/domain';
import { CaseStatuses } from '../../../../common/types/domain';
import { DEFAULT_CASE_STATUSES } from '../../../../common/utils/statuses';
import { renderWithTestingProviders } from '../../../common/mock';
import * as customStatuses from '../../../common/custom_statuses';
import * as api from '../../../containers/api';
import { StatusFilter } from './status_filter';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import * as i18n from '../translations';

const LABELS = {
  closed: i18n.STATUS_CLOSED,
  open: i18n.STATUS_OPEN,
  inProgress: i18n.STATUS_IN_PROGRESS,
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

  afterEach(() => {
    jest.clearAllMocks();
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

  describe('with custom statuses', () => {
    const triage: CaseStatusDefinition = {
      key: 'triage',
      label: 'Triage',
      color: 'accent',
      category: 'not_started',
      order: 1,
      isDefault: false,
      disabled: false,
    };
    const retired: CaseStatusDefinition = {
      ...triage,
      key: 'retired',
      label: 'Retired',
      category: 'active',
      order: 3,
      disabled: true,
    };
    // Admin order mixes categories: Open, Triage, In progress, Retired, Closed.
    const statuses: CaseStatusDefinition[] = [
      { ...DEFAULT_CASE_STATUSES[0], order: 0 },
      triage,
      { ...DEFAULT_CASE_STATUSES[1], order: 2 },
      retired,
      { ...DEFAULT_CASE_STATUSES[2], order: 4 },
    ];

    beforeEach(() => {
      jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(true);
      jest.spyOn(api, 'getCaseStatuses').mockResolvedValue(statuses);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('lists the statuses flat in admin order, without category counts', async () => {
      renderWithTestingProviders(<StatusFilter {...defaultProps} />);

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();

      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(5));
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveTextContent(/^Open/);
      expect(options[1]).toHaveTextContent(/^Triage/);
      expect(options[2]).toHaveTextContent(/^In progress/);
      expect(options[3]).toHaveTextContent(/^RetiredDisabled/);
      expect(options[4]).toHaveTextContent(/^Closed/);
      expect(screen.queryByText(' (2)')).not.toBeInTheDocument();
    });

    it('filters by status key', async () => {
      renderWithTestingProviders(<StatusFilter {...defaultProps} />);

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();
      await userEvent.click(await screen.findByRole('option', { name: 'Triage' }));

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith({
          filterId: 'statusKey',
          selectedOptionKeys: ['triage'],
        });
      });
    });

    it('marks the selected status keys', async () => {
      renderWithTestingProviders(
        <StatusFilter {...defaultProps} selectedOptionKeys={[]} selectedStatusKeys={['triage']} />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();

      expect(await screen.findByRole('option', { name: 'Triage' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('leaves out statuses of hidden categories', async () => {
      renderWithTestingProviders(
        <StatusFilter {...defaultProps} hiddenStatuses={[CaseStatuses.closed]} />
      );

      await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
      await waitForEuiPopoverOpen();

      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(4));
      expect(screen.queryByRole('option', { name: 'Closed' })).not.toBeInTheDocument();
    });
  });
});
