/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FilterListUsagePopover } from './filter_list_usage_popover';

describe('FilterListUsagePopover', () => {
  test('renders the popover for 1 job', () => {
    const props = {
      entityType: 'job',
      entityValues: ['farequote'],
    };

    const { container } = render(<FilterListUsagePopover {...props} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders the popover for 2 detectors', () => {
    const detectorProps = {
      entityType: 'detector',
      entityValues: ['mean responsetime', 'max responsetime', 'count'],
    };
    const { container } = render(<FilterListUsagePopover {...detectorProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('opens the popover on button click', async () => {
    const detectorProps = {
      entityType: 'detector',
      entityValues: ['mean responsetime', 'max responsetime', 'count'],
    };
    const { getByRole, queryByText, getByText } = render(
      <FilterListUsagePopover {...detectorProps} />
    );

    // Popover should be closed initially
    expect(queryByText('mean responsetime')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(getByRole('button'));

    // Verify popover content is visible without using snapshots
    expect(getByText('mean responsetime')).toBeInTheDocument();
    expect(getByText('max responsetime')).toBeInTheDocument();
    expect(getByText('count')).toBeInTheDocument();
  });
});
