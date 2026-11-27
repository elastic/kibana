/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import type { MatchesPopoverProps } from './matches_popover';
import { MatchesPopover } from './matches_popover';

const renderPopover = (props: Partial<MatchesPopoverProps> = {}) =>
  render(
    <MatchesPopover
      button={<button type="button">{'Show matches'}</button>}
      isOpen
      closePopover={jest.fn()}
      type="indices"
      matches={[{ name: 'products' }, { name: 'users' }]}
      {...props}
    />
  );

describe('MatchesPopover', () => {
  it('shows the indices title and the match count', () => {
    renderPopover();

    expect(screen.getByText('Matching indices')).toBeInTheDocument();
    expect(screen.getByTestId('searchBoostMatchesPopoverCount').textContent).toBe('2 matches');
    expect(screen.getAllByTestId('searchBoostMatchesPopoverItem')).toHaveLength(2);
  });

  it('shows the data streams title', () => {
    renderPopover({ type: 'data_streams' });

    expect(screen.getByText('Matching data streams')).toBeInTheDocument();
  });

  it('counts outranked matches and marks them with an icon', () => {
    renderPopover({
      matches: [
        { name: 'products', outrankedByRuleName: 'Product catalog' },
        { name: 'archive', outrankedByRuleName: 'Product catalog' },
        { name: 'users' },
      ],
    });

    expect(screen.getByTestId('searchBoostMatchesPopoverCount').textContent).toBe(
      '3 matches, 2 outranked'
    );
    expect(screen.getAllByTestId('searchBoostMatchesPopoverOutrankedIcon')).toHaveLength(2);
  });

  it('lists hidden matches with the rest', () => {
    renderPopover({
      matches: [{ name: 'products' }, { name: '.internal-alerts' }],
    });

    expect(screen.getByTestId('searchBoostMatchesPopoverCount').textContent).toBe('2 matches');
    expect(
      screen.getAllByTestId('searchBoostMatchesPopoverItem').map(({ textContent }) => textContent)
    ).toEqual(['products', '.internal-alerts']);
  });

  it('does not render the content when closed', () => {
    renderPopover({ isOpen: false });

    expect(screen.queryByText('Matching indices')).not.toBeInTheDocument();
  });
});
