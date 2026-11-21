/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiBadge } from '@elastic/eui';
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

    it.each([
      [CaseStatuses.open, 'success'],
      [CaseStatuses['in-progress'], 'primary'],
      [CaseStatuses.closed, 'default'],
    ] as const)('renders the %s status badge with the %s color', (status, color) => {
      // Emotion derives the class name from the styles, so a badge rendered with the
      // expected color shares its class with the same badge rendered with that color.
      const getClassName = (element: React.ReactElement, testId: string) => {
        const { unmount } = render(element);
        const { className } = screen.getByTestId(testId);
        unmount();
        return className;
      };

      const badgeProps = {
        iconType: 'chevronSingleDown',
        iconSide: 'right',
        iconOnClick: onClick,
        iconOnClickAriaLabel: 'aria-label',
      } as const;

      const actual = getClassName(
        <StatusPopoverButton status={status} onClick={onClick} />,
        `case-status-badge-popover-button-${status}`
      );
      const expected = getClassName(
        <EuiBadge {...badgeProps} data-test-subj="reference" color={color}>
          {'label'}
        </EuiBadge>,
        'reference'
      );
      const otherColors = (['success', 'primary', 'default'] as const)
        .filter((c) => c !== color)
        .map((c) =>
          getClassName(
            <EuiBadge {...badgeProps} data-test-subj="reference" color={c}>
              {'label'}
            </EuiBadge>,
            'reference'
          )
        );

      expect(actual).toBe(expected);
      otherColors.forEach((other) => expect(actual).not.toBe(other));
    });
  });
});
