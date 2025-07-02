/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { AppMockRenderer } from '../../../lib/test_utils';
import { createAppMockRenderer } from '../../../lib/test_utils';
import { StatusFilter } from './status_filter';
import { MaintenanceWindowStatus } from '../../../../common';

describe('StatusFilter', () => {
  let appMockRenderer: AppMockRenderer;
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders', () => {
    const result = appMockRenderer.render(<StatusFilter selectedStatus={[]} onChange={onChange} />);

    expect(result.getByTestId('status-filter-button')).toBeInTheDocument();
  });

  test('it shows the popover', async () => {
    const result = appMockRenderer.render(<StatusFilter selectedStatus={[]} onChange={onChange} />);

    fireEvent.click(result.getByTestId('status-filter-button'));

    await waitForEuiPopoverOpen();
    expect(result.getByTestId('status-filter-running')).toBeInTheDocument();
    expect(result.getByTestId('status-filter-upcoming')).toBeInTheDocument();
    expect(result.getByTestId('status-filter-finished')).toBeInTheDocument();
    expect(result.getByTestId('status-filter-archived')).toBeInTheDocument();
  });

  test('should have 2 active filters', async () => {
    const result = appMockRenderer.render(
      <StatusFilter
        selectedStatus={[MaintenanceWindowStatus.Running, MaintenanceWindowStatus.Upcoming]}
        onChange={onChange}
      />
    );

    fireEvent.click(result.getByTestId('status-filter-button'));
    await waitForEuiPopoverOpen();

    // Find the span containing the notification badge (with the active filter count)
    const notificationBadge = screen.getByRole('marquee', {
      name: /2 active filters/i,
    });

    expect(notificationBadge).toHaveTextContent('2');
  });
});
