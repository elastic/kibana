/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAX_CASE_PAUSE_REASONS } from '../../../../common/constants';
import { renderWithTestingProviders } from '../../../common/mock';
import { PauseReasons } from './pause_reasons';

describe('PauseReasons', () => {
  const props = {
    reasons: ['Awaiting customer', 'Awaiting vendor'],
    hasPausingStatus: true,
    disabled: false,
    isLoading: false,
    onAdd: jest.fn(),
    onEdit: jest.fn(),
    onMove: jest.fn(),
    onRemove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists the reasons in order with an add button', () => {
    renderWithTestingProviders(<PauseReasons {...props} />);

    const rows = screen.getAllByTestId(/^case-pause-reason-row-/);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Awaiting customer');
    expect(rows[1]).toHaveTextContent('Awaiting vendor');
    expect(screen.getByTestId('case-pause-reasons-add')).toBeInTheDocument();
  });

  it('edits, moves, and removes a reason from its row actions', async () => {
    renderWithTestingProviders(<PauseReasons {...props} />);

    await userEvent.click(screen.getByTestId('case-pause-reason-Awaiting customer-actions'));
    expect(
      screen.queryByTestId('case-pause-reason-Awaiting customer-move-up')
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('case-pause-reason-Awaiting customer-edit'));
    expect(props.onEdit).toHaveBeenCalledWith('Awaiting customer');

    await userEvent.click(screen.getByTestId('case-pause-reason-Awaiting customer-actions'));
    await userEvent.click(screen.getByTestId('case-pause-reason-Awaiting customer-move-down'));
    expect(props.onMove).toHaveBeenCalledWith('Awaiting customer', 'down');

    await userEvent.click(screen.getByTestId('case-pause-reason-Awaiting vendor-actions'));
    await userEvent.click(screen.getByTestId('case-pause-reason-Awaiting vendor-remove'));
    expect(props.onRemove).toHaveBeenCalledWith('Awaiting vendor');
  });

  it('does not let the last reason go while a status pauses time tracking', async () => {
    renderWithTestingProviders(<PauseReasons {...props} reasons={['Awaiting customer']} />);

    await userEvent.click(screen.getByTestId('case-pause-reason-Awaiting customer-actions'));

    expect(screen.getByTestId('case-pause-reason-Awaiting customer-remove')).toBeDisabled();
  });

  it('lets the last reason go when no enabled status pauses time tracking', async () => {
    renderWithTestingProviders(
      <PauseReasons {...props} reasons={['Awaiting customer']} hasPausingStatus={false} />
    );

    await userEvent.click(screen.getByTestId('case-pause-reason-Awaiting customer-actions'));

    expect(screen.getByTestId('case-pause-reason-Awaiting customer-remove')).not.toBeDisabled();
  });

  it('shows the limit instead of the add button when the list is full', () => {
    const reasons = Array.from({ length: MAX_CASE_PAUSE_REASONS }, (_, index) => `Reason ${index}`);
    renderWithTestingProviders(<PauseReasons {...props} reasons={reasons} />);

    expect(screen.queryByTestId('case-pause-reasons-add')).not.toBeInTheDocument();
    expect(screen.getByTestId('case-pause-reasons-limit')).toBeInTheDocument();
  });

  it('disables every action while saving', () => {
    renderWithTestingProviders(<PauseReasons {...props} disabled={true} />);

    expect(screen.getByTestId('case-pause-reason-Awaiting customer-actions')).toBeDisabled();
    expect(screen.getByTestId('case-pause-reasons-add')).toBeDisabled();
  });
});
