/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduledReportForm } from './scheduled_report_flyout_content';
import { ReportFormat, ScheduledReport } from '../../types';
import { useKibana } from '@kbn/reporting-public';
import userEvent from '@testing-library/user-event';

// Mock Kibana hooks and context
jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: () => 'UTC',
}));

jest.mock('@kbn/response-ops-recurring-schedule-form/components/recurring_schedule_field', () => ({
  RecurringScheduleField: () => <div data-test-subj="recurring-schedule-field" />,
}));

describe('ScheduledReportForm', () => {
  const scheduledReport = {
    jobParams: {},
    fileName: '',
    fileType: 'pdf',
  } as ScheduledReport;

  const availableFormats: ReportFormat[] = [
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

  const onClose = jest.fn();

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        actions: {
          validateEmailAddresses: jest.fn().mockResolvedValue([]),
        },
      },
    });
    jest.clearAllMocks();
  });

  it('renders form fields', () => {
    render(
      <ScheduledReportForm
        scheduledReport={scheduledReport}
        availableFormats={availableFormats}
        onClose={onClose}
        hasEmailConnector={true}
      />
    );

    expect(screen.getByText('Report name')).toBeInTheDocument();
    expect(screen.getByText('File type')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Timezone')).toBeInTheDocument();
    expect(screen.getByText('Make recurring')).toBeInTheDocument();
    expect(screen.getByText('Send by email')).toBeInTheDocument();
  });

  it('shows recurring schedule fields when recurring is enabled', async () => {
    render(
      <ScheduledReportForm
        scheduledReport={scheduledReport}
        availableFormats={availableFormats}
        onClose={onClose}
        hasEmailConnector={true}
      />
    );

    const toggle = screen.getByText('Make recurring');
    fireEvent.click(toggle);

    expect(await screen.findByTestId('recurring-schedule-field')).toBeInTheDocument();
  });

  it('shows email fields when send by email is enabled', async () => {
    render(
      <ScheduledReportForm
        scheduledReport={scheduledReport}
        availableFormats={availableFormats}
        onClose={onClose}
        hasEmailConnector={true}
      />
    );

    const toggle = screen.getByText('Send by email');
    fireEvent.click(toggle);

    expect(await screen.findByText('To')).toBeInTheDocument();
    expect(await screen.findByText('Sensitive information')).toBeInTheDocument();
  });

  it('shows warning when email connector is missing', () => {
    render(
      <ScheduledReportForm
        scheduledReport={scheduledReport}
        availableFormats={availableFormats}
        onClose={onClose}
        hasEmailConnector={false}
      />
    );

    expect(screen.getByText('No email connector configured')).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    render(
      <ScheduledReportForm
        scheduledReport={scheduledReport}
        availableFormats={availableFormats}
        onClose={onClose}
        hasEmailConnector={true}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
