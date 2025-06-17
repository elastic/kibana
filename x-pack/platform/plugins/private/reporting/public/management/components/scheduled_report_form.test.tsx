/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { type ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import { ScheduledReportForm } from './scheduled_report_form';
import { ReportTypeData, ScheduledReport } from '../../types';
import { scheduleReport } from '../apis/schedule_report';
import { coreMock } from '@kbn/core/public/mocks';
import { testQueryClient } from '../test_utils/test_query_client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ScheduledReportApiJSON } from '../../../server/types';

// Mock Kibana hooks and context
jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: () => 'UTC',
}));

jest.mock(
  '@kbn/response-ops-recurring-schedule-form/components/recurring_schedule_form_fields',
  () => ({
    RecurringScheduleFormFields: () => <div data-test-subj="recurring-schedule-form-fields" />,
  })
);

jest.mock('../apis/schedule_report');
const mockScheduleReport = jest.mocked(scheduleReport);
mockScheduleReport.mockResolvedValue({
  job: {
    id: '8c5529c0-67ed-41c4-8a1b-9a97bdc11d27',
    jobtype: 'printable_pdf_v2',
    created_at: '2025-06-17T15:50:52.879Z',
    created_by: 'elastic',
    meta: {
      isDeprecated: false,
      layout: 'preserve_layout',
      objectType: 'dashboard',
    },
    schedule: {
      rrule: {
        tzid: 'UTC',
        byhour: [17],
        byminute: [50],
        freq: 3,
        interval: 1,
        byweekday: ['TU'],
      },
    },
  } as unknown as ScheduledReportApiJSON,
});

const objectType = 'dashboard';
const sharingData = {
  title: 'Title',
  reportingDisabled: false,
  locatorParams: {
    id: 'DASHBOARD_APP_LOCATOR',
    params: {
      dashboardId: 'f09d5bbe-da16-4975-a04c-ad03c84e586b',
      preserveSavedFilters: true,
      viewMode: 'view',
      useHash: false,
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
    },
  },
};

const mockApiClient = {
  getDecoratedJobParams: jest.fn().mockImplementation((params) => params),
} as unknown as ReportingAPIClient;

const TestProviders = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);

describe('ScheduledReportForm', () => {
  const scheduledReport = {
    title: 'Title',
    reportTypeId: 'printablePdfV2',
  } as ScheduledReport;

  const availableFormats: ReportTypeData[] = [
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

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...coreMock.createStart(),
        actions: {
          validateEmailAddresses: jest.fn().mockResolvedValue([]),
        },
      },
    });
    jest.clearAllMocks();
    testQueryClient.clear();
  });

  it('renders form fields', () => {
    render(
      <TestProviders>
        <ScheduledReportForm
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          hasEmailConnector={true}
        />
      </TestProviders>
    );

    expect(screen.getByText('Report name')).toBeInTheDocument();
    expect(screen.getByText('File type')).toBeInTheDocument();
    expect(screen.getByText('Send by email')).toBeInTheDocument();
  });

  it('shows email fields when send by email is enabled', async () => {
    render(
      <TestProviders>
        <ScheduledReportForm
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          hasEmailConnector={true}
        />
      </TestProviders>
    );

    const toggle = screen.getByText('Send by email');
    fireEvent.click(toggle);

    expect(await screen.findByText('To')).toBeInTheDocument();
    expect(await screen.findByText('Sensitive information')).toBeInTheDocument();
  });

  it('shows warning when email connector is missing', () => {
    render(
      <TestProviders>
        <ScheduledReportForm
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          hasEmailConnector={false}
        />
      </TestProviders>
    );

    expect(screen.getByText("Email connector hasn't been created yet")).toBeInTheDocument();
  });
});
