/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBoostTabs } from './search_boost_tabs';

describe('SearchBoostTabs', () => {
  it('marks the selected tab and calls back with the one clicked', async () => {
    const onSelectTab = jest.fn();
    render(<SearchBoostTabs selectedTab="rules" onSelectTab={onSelectTab} />);

    expect(screen.getByRole('tab', { name: 'Boost rules' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Boost profiles' })).toHaveAttribute(
      'aria-selected',
      'false'
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Boost profiles' }));

    expect(onSelectTab).toHaveBeenCalledWith('profiles');
  });
});
