/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseStatuses } from '../../../common/types/domain';
import { StatusPopoverButton } from './status_popover_button';

describe('StatusPopoverButton', () => {
  const onClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    render(<StatusPopoverButton status={CaseStatuses.open} onClick={onClick} />);

    expect(screen.getByTestId('case-status-badge-popover-button-open')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with the pop over enabled by default', async () => {
    render(<StatusPopoverButton status={CaseStatuses.open} onClick={onClick} />);

    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('disables the button correctly', async () => {
    render(<StatusPopoverButton disabled={true} status={CaseStatuses.open} onClick={onClick} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when pressing the badge', async () => {
    render(<StatusPopoverButton status={CaseStatuses.open} onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  describe('Colors', () => {
    it.each([
      [CaseStatuses.open, 'Open'],
      [CaseStatuses['in-progress'], 'In progress'],
      [CaseStatuses.closed, 'Closed'],
    ])('renders the %s status badge with its label', async (status, label) => {
      render(<StatusPopoverButton status={status} onClick={onClick} />);

      expect(screen.getByTestId(`case-status-badge-popover-button-${status}`)).toHaveTextContent(
        label
      );
    });

    it('renders a distinct badge color per status', () => {
      // Emotion derives the class name from the styles, so different colors yield different classes
      const getClassName = (status: CaseStatuses) => {
        const { unmount } = render(<StatusPopoverButton status={status} onClick={onClick} />);
        const { className } = screen.getByTestId(`case-status-badge-popover-button-${status}`);
        unmount();
        return className;
      };

      const classNames = [CaseStatuses.open, CaseStatuses['in-progress'], CaseStatuses.closed].map(
        getClassName
      );

      expect(new Set(classNames).size).toBe(3);
    });
  });
});
