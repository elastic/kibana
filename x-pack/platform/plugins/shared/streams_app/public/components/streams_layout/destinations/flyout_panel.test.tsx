/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FlyoutPanel } from './flyout_panel';

// The picker is the page's own, and reads its time filter and route.
jest.mock('../../stream_detail_overview/overview_time_filter', () => ({
  OverviewTimeFilter: () => <div data-test-subj="timePicker" />,
}));

describe('FlyoutPanel', () => {
  it('has a title, a subtitle and its content', () => {
    render(
      <FlyoutPanel title="Configuration" subtitle="For the selected time range">
        <span>Content</span>
      </FlyoutPanel>
    );

    expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getByText('For the selected time range')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('has no subtitle when it has none', () => {
    const { container } = render(<FlyoutPanel title="Configuration">Content</FlyoutPanel>);

    expect(container.querySelector('p')).toBeNull();
  });

  it('has no time picker unless asked', () => {
    render(<FlyoutPanel title="Configuration">Content</FlyoutPanel>);

    expect(screen.queryByTestId('timePicker')).not.toBeInTheDocument();
  });

  it('has the time picker when asked', () => {
    render(
      <FlyoutPanel title="Delivery failures" showTimePicker>
        Content
      </FlyoutPanel>
    );

    expect(screen.getByTestId('timePicker')).toBeInTheDocument();
  });
});
