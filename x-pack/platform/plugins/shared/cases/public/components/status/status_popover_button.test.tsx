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

/**
 * Collects the color related CSS declarations Emotion generated for the element's classes,
 * so that colors can be compared without depending on the generated class names.
 */
const getColorDeclarations = (element: HTMLElement): string[] => {
  // only Emotion's generated classes (`css-<hash>-<label>`) carry the badge's styles
  const classNames = Array.from(element.classList).filter((c) => c.startsWith('css-'));
  const declarations: string[] = [];

  Array.from(document.styleSheets).forEach((sheet) => {
    Array.from(sheet.cssRules).forEach((rule) => {
      if (
        rule instanceof CSSStyleRule &&
        classNames.some((c) => rule.selectorText.includes(`.${c}`))
      ) {
        Array.from(rule.style).forEach((property) => {
          if (/color/i.test(property)) {
            declarations.push(`${property}: ${rule.style.getPropertyValue(property)}`);
          }
        });
      }
    });
  });

  return declarations.sort();
};

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
      [CaseStatuses.open, 'success'],
      [CaseStatuses['in-progress'], 'primary'],
      [CaseStatuses.closed, 'default'],
    ] as const)('renders the %s status badge with the %s color', (status, color) => {
      const badgeProps = {
        iconType: 'chevronSingleDown',
        iconSide: 'right',
        iconOnClick: onClick,
        iconOnClickAriaLabel: 'aria-label',
        'data-test-subj': 'badge',
      } as const;

      const getColors = (element: React.ReactElement, testId = 'badge') => {
        const { unmount } = render(element);
        const colors = getColorDeclarations(screen.getByTestId(testId));
        unmount();
        return colors;
      };

      const actual = getColors(
        <StatusPopoverButton status={status} onClick={onClick} />,
        `case-status-badge-popover-button-${status}`
      );
      const expected = getColors(
        <EuiBadge {...badgeProps} color={color}>
          {'label'}
        </EuiBadge>
      );

      expect(actual).not.toHaveLength(0);
      expect(actual).toEqual(expected);

      (['success', 'primary', 'default'] as const)
        .filter((c) => c !== color)
        .forEach((other) => {
          expect(
            getColors(
              <EuiBadge {...badgeProps} color={other}>
                {'label'}
              </EuiBadge>
            )
          ).not.toEqual(actual);
        });
    });
  });
});
