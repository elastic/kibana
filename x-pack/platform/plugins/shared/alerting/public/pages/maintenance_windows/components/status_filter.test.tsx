/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import { StatusFilter } from './status_filter';
import { MaintenanceWindowStatus } from '../../../../common';

describe('StatusFilter', () => {
  let appMockRenderer: AppMockRenderer;
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(<StatusFilter selectedStatus={[]} onChange={onChange} />);

    expect(screen.getByTestId('status-filter-button')).toBeInTheDocument();
  });

  test('it shows the popover', async () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(<StatusFilter selectedStatus={[]} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('status-filter-button'));

    await waitForEuiPopoverOpen();
    expect(screen.getByTestId('status-filter-running')).toBeInTheDocument();
    expect(screen.getByTestId('status-filter-upcoming')).toBeInTheDocument();
    expect(screen.getByTestId('status-filter-finished')).toBeInTheDocument();
    expect(screen.getByTestId('status-filter-archived')).toBeInTheDocument();
  });

  test('should have 2 active filters', async () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <StatusFilter
        selectedStatus={[MaintenanceWindowStatus.Running, MaintenanceWindowStatus.Upcoming]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('status-filter-button'));
    await waitForEuiPopoverOpen();

    // Find the span containing the notification badge (with the active filter count)
    const notificationBadge = screen.getByRole('marquee', {
      name: /2 active filters/i,
    });

    expect(notificationBadge).toHaveTextContent('2');
  });
});
