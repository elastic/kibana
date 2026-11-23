/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { MatchesBadgeProps } from './matches_badge';
import { MatchesBadge } from './matches_badge';

const defaultProps: MatchesBadgeProps = {
  type: 'indices',
  matches: [
    { name: 'products', isHidden: false },
    { name: 'users', isHidden: false },
  ],
  getOnClickAriaLabel: (count) => `Show ${count} matches`,
  'data-test-subj': 'matchesBadge',
};

describe('MatchesBadge', () => {
  it('opens the matches popover from the count badge', async () => {
    render(<MatchesBadge {...defaultProps} />);

    const badge = screen.getByRole('button', { name: 'Show 2 matches' });
    expect(badge).toHaveTextContent('2 indices');

    await userEvent.click(badge);

    expect(await screen.findByTestId('searchBoostMatchesPopoverList')).toHaveTextContent(
      'productsusers'
    );
  });

  it('counts only the matches it applies to, leaving out outranked ones', () => {
    render(
      <MatchesBadge
        {...defaultProps}
        matches={[
          ...defaultProps.matches,
          { name: 'archive', isHidden: false, outrankedByRuleName: 'catalog' },
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'Show 2 matches' })).toHaveTextContent('2 indices');
  });

  it('shows a plain count badge without a popover when there are no matches', () => {
    render(<MatchesBadge {...defaultProps} matches={[]} />);

    const badge = screen.getByTestId('matchesBadge');
    expect(badge).toHaveTextContent('0 indices');
    expect(badge.tagName).toBe('SPAN');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('searchBoostMatchesPopover')).not.toBeInTheDocument();
  });
});
