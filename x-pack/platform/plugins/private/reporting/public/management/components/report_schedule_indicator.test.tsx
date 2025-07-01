/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { Frequency } from '@kbn/rrule';
import { ReportScheduleIndicator } from './report_schedule_indicator';

describe('ReportScheduleIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders daily schedule indicator correctly', async () => {
    render(
      <ReportScheduleIndicator
        schedule={{
          rrule: {
            freq: Frequency.DAILY,
            interval: 1,
            tzid: 'UTC',
          },
        }}
      />
    );

    expect(await screen.findByTestId('reportScheduleIndicator-3')).toBeInTheDocument();
    expect(await screen.findByText('Daily')).toBeInTheDocument();
  });

  it('renders weekly schedule indicator correctly', async () => {
    render(
      <ReportScheduleIndicator
        schedule={{
          rrule: { freq: Frequency.WEEKLY, interval: 3, tzid: 'Europe/London' },
        }}
      />
    );

    expect(await screen.findByTestId('reportScheduleIndicator-2')).toBeInTheDocument();
    expect(await screen.findByText('Weekly')).toBeInTheDocument();
  });

  it('renders monthly schedule indicator correctly', async () => {
    render(
      <ReportScheduleIndicator
        schedule={{
          rrule: { freq: Frequency.MONTHLY, interval: 6, tzid: 'America/NewYork' },
        }}
      />
    );

    expect(await screen.findByTestId('reportScheduleIndicator-1')).toBeInTheDocument();
    expect(await screen.findByText('Monthly')).toBeInTheDocument();
  });

  it('returns null when no frequency do not match', async () => {
    render(
      <ReportScheduleIndicator
        // @ts-expect-error we don't need to provide all props for the test
        schedule={{ rrule: { freq: Frequency.YEARLY, interval: 1, tzid: 'UTC' } }}
      />
    );

    expect(screen.queryByTestId('reportScheduleIndicator-0')).not.toBeInTheDocument();
    expect(screen.queryByText('Yearly')).not.toBeInTheDocument();
  });

  it('returns null when no rrule', async () => {
    // @ts-expect-error we don't need to provide all props for the test
    const res = render(<ReportScheduleIndicator schedule={{}} />);

    expect(res.container.getElementsByClassName('euiBadge').length).toBe(0);
  });
});
