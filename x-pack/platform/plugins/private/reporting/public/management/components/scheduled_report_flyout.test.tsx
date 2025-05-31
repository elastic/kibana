/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScheduledReportFlyout } from './scheduled_report_flyout';
import * as getReportingHealthModule from '../apis/get_reporting_health';
import { ReportFormat, ScheduledReport } from '../../types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('./scheduled_report_flyout_content', () => ({
  ScheduledReportForm: () => <div>ScheduledReportForm</div>,
}));

const mockScheduledReport: ScheduledReport = {
  id: '1',
  jobParams: { foo: 'bar' },
} as any;
const mockFormats: ReportFormat[] = [
  {
    id: 'printablePdfV2',
    label: 'PDF',
  },
  {
    id: 'pngV2',
    label: 'PNG',
  },
  {
    id: 'csv_searchsource',
    label: 'CSV',
  },
];
const mockOnClose = jest.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {},
  },
});

describe('ScheduledReportFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders loading state', () => {
    jest
      .spyOn(getReportingHealthModule, 'getReportingHealth')
      .mockImplementation(() => new Promise(() => {}));

    render(
      <QueryClientProvider client={queryClient}>
        <ScheduledReportFlyout
          scheduledReport={mockScheduledReport}
          availableFormats={mockFormats}
          onClose={mockOnClose}
        />
      </QueryClientProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state', async () => {
    jest.spyOn(getReportingHealthModule, 'getReportingHealth').mockImplementation(async () => {
      throw new Error('Test error');
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ScheduledReportFlyout
          scheduledReport={mockScheduledReport}
          availableFormats={mockFormats}
          onClose={mockOnClose}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Cannot load reporting health')).toBeInTheDocument();
  });

  it('renders form with reporting health', async () => {
    jest.spyOn(getReportingHealthModule, 'getReportingHealth').mockResolvedValue({
      hasPermanentEncryptionKey: true,
      isSufficientlySecure: true,
      hasEmailConnector: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ScheduledReportFlyout
          scheduledReport={mockScheduledReport}
          availableFormats={mockFormats}
          onClose={mockOnClose}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText('ScheduledReportForm')).toBeInTheDocument();
  });
});
