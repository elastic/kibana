/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DataStreamsBoostProfile, IndicesBoostProfile } from '../../../common/types';
import type { AppliesToFooterProps } from './applies_to_footer';
import { AppliesToFooter } from './applies_to_footer';

const indicesProfile: IndicesBoostProfile = {
  name: 'default_indices',
  is_builtin: true,
  type: 'indices',
  min_boost: 1,
  max_boost: 1,
  availability: 'base',
  prewarm: true,
  pinned: true,
};

const dataStreamsProfile: DataStreamsBoostProfile = {
  name: 'default_data_streams_7d',
  is_builtin: true,
  type: 'data_streams',
  recent: { min_boost: 1, max_boost: 1, max_age: '1d' },
  standard: { min_boost: 0.5, max_boost: 1, max_age: '7d' },
  background: { min_boost: 0, max_boost: 0.1 },
};

const defaultProps: AppliesToFooterProps = {
  type: 'indices',
  matches: [
    { name: 'products', isHidden: false },
    { name: 'users', isHidden: false },
  ],
  storageSizeInBytes: 2.1 * 1024 ** 3,
};

describe('AppliesToFooter', () => {
  it.each([
    ['indices', '2 indices'],
    ['data_streams', '2 data streams'],
  ] as const)('shows the %s count and the storage size', (type, countLabel) => {
    render(<AppliesToFooter {...defaultProps} type={type} />);

    expect(screen.getByText('Applies to')).toBeInTheDocument();
    expect(screen.getByTestId('searchBoostAppliesToCount')).toHaveTextContent(countLabel);
    expect(screen.getByTestId('searchBoostAppliesToSize')).toHaveTextContent('2.1 GB');
  });

  it('counts only the matches it applies to, leaving out outranked ones', () => {
    render(
      <AppliesToFooter
        {...defaultProps}
        matches={[
          ...defaultProps.matches,
          { name: 'archive', isHidden: false, outrankedByRuleName: 'catalog' },
        ]}
      />
    );

    expect(
      screen.getByRole('button', { name: '2 indices. Show what this applies to' })
    ).toBeInTheDocument();
  });

  it('lists what it applies to from the count badge', async () => {
    render(<AppliesToFooter {...defaultProps} />);

    await userEvent.click(
      screen.getByRole('button', { name: '2 indices. Show what this applies to' })
    );

    expect(await screen.findByTestId('searchBoostMatchesPopoverList')).toHaveTextContent(
      'productsusers'
    );
  });

  it('shows the timeline for a data streams profile', () => {
    render(<AppliesToFooter {...defaultProps} type="data_streams" profile={dataStreamsProfile} />);

    expect(screen.getByTestId('searchBoostTimeline')).toBeInTheDocument();
  });

  it.each([
    ['an indices profile', indicesProfile],
    ['no profile', undefined],
  ])('shows no timeline for %s', (_, profile) => {
    render(<AppliesToFooter {...defaultProps} profile={profile} />);

    expect(screen.queryByTestId('searchBoostTimeline')).not.toBeInTheDocument();
  });
});
