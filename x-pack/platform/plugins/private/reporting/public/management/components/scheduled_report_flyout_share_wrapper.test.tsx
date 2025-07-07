/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ScheduledReportFlyoutShareWrapper,
  ScheduledReportMenuItem,
} from './scheduled_report_flyout_share_wrapper';
import { useShareTypeContext } from '@kbn/share-plugin/public';
import { ScheduledReportFlyoutContent } from './scheduled_report_flyout_content';

jest.mock('./scheduled_report_flyout_content');
jest.mocked(ScheduledReportFlyoutContent).mockReturnValue(<div data-test-subj="flyoutContent" />);

jest.mock('@kbn/share-plugin/public');
const mockUseShareTypeContext = jest.mocked(useShareTypeContext).mockReturnValue({
  objectType: 'dashboard',
  shareMenuItems: [
    { config: { exportType: 'printablePdfV2', label: 'PDF' } },
    { config: { exportType: 'csv_searchsource', label: 'CSV' } },
  ],
});

const mockApiClient = {} as any;
const mockReportingServices = { serviceFromReporting: {} } as any;
const mockSharingData = { title: 'Test Report' } as any;
const mockOnClose = jest.fn();

const defaultProps: ScheduledReportMenuItem = {
  apiClient: mockApiClient,
  services: mockReportingServices,
  sharingData: mockSharingData,
  onClose: mockOnClose,
};

describe('ScheduledReportFlyoutShareWrapper', () => {
  const mockUseKibana = jest.fn();
  jest.mock('@kbn/reporting-public', () => ({
    ...jest.requireActual('@kbn/reporting-public'),
    useKibana: mockUseKibana,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { otherService: {} } });
  });

  it('should render ScheduledReportFlyoutContent if at least one compatible report type is available', () => {
    render(<ScheduledReportFlyoutShareWrapper {...defaultProps} />);
    expect(screen.getByTestId('flyoutContent')).toBeInTheDocument();
  });

  it('should render null if reporting services are missing', () => {
    const { container } = render(
      // @ts-expect-error Testing missing services
      <ScheduledReportFlyoutShareWrapper {...defaultProps} services={{}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should show a warning CallOut if no report type is supported for scheduling', () => {
    mockUseShareTypeContext.mockReturnValue({
      shareMenuItems: [],
      objectType: 'test',
    });
    render(<ScheduledReportFlyoutShareWrapper {...defaultProps} />);
    expect(screen.getByText('Scheduled reports are not supported here yet')).toBeInTheDocument();
  });
});
