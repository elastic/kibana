/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fireEvent } from '@testing-library/react';
import * as React from 'react';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import { UpcomingEventsPopover } from './upcoming_events_popover';
import { MaintenanceWindowStatus } from '../../../../common';

describe('rule_actions_popover', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders the top 3 events', () => {
    const result = appMockRenderer.render(
      <UpcomingEventsPopover
        maintenanceWindowFindResponse={{
          title: 'test MW',
          enabled: true,
          duration: 0,
          events: [
            { gte: '2023-04-14T14:58:40.243Z', lte: '2023-04-14T14:58:40.243Z' },
            { gte: '2023-04-21T14:58:40.243Z', lte: '2023-04-21T14:58:40.243Z' },
            { gte: '2023-04-28T14:58:40.243Z', lte: '2023-04-28T14:58:40.243Z' },
            { gte: '2023-05-05T14:58:40.243Z', lte: '2023-05-05T14:58:40.243Z' },
            { gte: '2023-05-12T14:58:40.243Z', lte: '2023-05-12T14:58:40.243Z' },
            { gte: '2023-05-19T14:58:40.243Z', lte: '2023-05-19T14:58:40.243Z' },
          ],
          id: 'dccedda0-dad4-11ed-9f8d-2b13e6c2138e',
          status: MaintenanceWindowStatus.Upcoming,
          expirationDate: '2024-04-14T14:58:58.997Z',
          rRule: {
            dtstart: '2023-04-14T14:58:40.243Z',
            tzid: 'America/New_York',
            freq: 3,
            interval: 1,
            byweekday: ['FR'],
          },
          createdBy: 'elastic',
          updatedBy: 'elastic',
          createdAt: '2023-04-14T14:58:58.997Z',
          updatedAt: '2023-04-14T14:58:58.997Z',
          eventStartTime: '2023-04-21T14:58:40.243Z',
          eventEndTime: '2023-04-21T14:58:40.243Z',
        }}
      />
    );

    const popoverButton = result.getByTestId('upcoming-events-icon-button');
    expect(popoverButton).toBeInTheDocument();
    fireEvent.click(popoverButton);

    expect(result.getByTestId('upcoming-events-popover-title')).toBeInTheDocument();
    expect(result.getByTestId('upcoming-events-popover-title')).toHaveTextContent(
      'Repeats every Friday'
    );
    expect(result.getAllByTestId('upcoming-events-popover-item').length).toBe(3);
  });
});
