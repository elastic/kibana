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
      matches={[
        { name: 'products', isHidden: false },
        { name: 'users', isHidden: false },
      ]}
      {...props}
    />
  );

describe('MatchesPopover', () => {
  it('shows the indices title and the match count', () => {
    renderPopover();

    expect(screen.getByText('Matching indices')).toBeInTheDocument();
    expect(screen.getByTestId('searchBoostMatchesPopoverCount')).toHaveTextContent('2 matches');
    expect(screen.getAllByTestId('searchBoostMatchesPopoverItem')).toHaveLength(2);
  });

  it('shows the data streams title', () => {
    renderPopover({ type: 'data_streams' });

    expect(screen.getByText('Matching data streams')).toBeInTheDocument();
  });

  it('counts outranked matches and marks them with an icon', () => {
    renderPopover({
      matches: [
        { name: 'products', isHidden: false, outrankedByRuleName: 'Product catalog' },
        { name: 'archive', isHidden: false, outrankedByRuleName: 'Product catalog' },
        { name: 'users', isHidden: false },
      ],
    });

    expect(screen.getByTestId('searchBoostMatchesPopoverCount')).toHaveTextContent(
      '3 matches, 2 outranked'
    );
    expect(screen.getAllByTestId('searchBoostMatchesPopoverOutrankedIcon')).toHaveLength(2);
  });

  it('counts hidden matches in the total but only lists visible ones', () => {
    renderPopover({
      matches: [
        { name: 'products', isHidden: false },
        { name: 'users', isHidden: false },
        { name: '.hidden-1', isHidden: true },
        { name: '.hidden-2', isHidden: true },
        { name: '.hidden-3', isHidden: true },
      ],
    });

    expect(screen.getByTestId('searchBoostMatchesPopoverCount')).toHaveTextContent('5 matches');
    expect(screen.getAllByTestId('searchBoostMatchesPopoverItem')).toHaveLength(2);
    expect(screen.queryByText('.hidden-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('searchBoostMatchesPopoverHidden')).toHaveTextContent(
      '+3 hidden indices'
    );
  });

  it('omits the plus sign when only hidden matches exist', () => {
    renderPopover({
      type: 'data_streams',
      matches: [{ name: '.hidden-1', isHidden: true }],
    });

    expect(screen.queryByTestId('searchBoostMatchesPopoverItem')).not.toBeInTheDocument();
    expect(screen.getByTestId('searchBoostMatchesPopoverHidden')).toHaveTextContent(
      '1 hidden data stream'
    );
  });

  it('does not render the content when closed', () => {
    renderPopover({ isOpen: false });

    expect(screen.queryByText('Matching indices')).not.toBeInTheDocument();
  });
});
