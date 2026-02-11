/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { JobSelector } from './job_selector';
import type { MlSummaryJob } from '../../../../common/types/anomaly_detection_jobs';

jest.mock('../../contexts/kibana', () => ({
  useMlKibana: () => ({}),
  useMlApi: () => ({}),
  useNotifications: () => ({}),
}));

jest.mock('./id_badges', () => ({
  IdBadges: () => <div data-test-subj="mockIdBadges" />,
}));

jest.mock('../anomaly_results_view_selector', () => ({
  AnomalyResultsViewSelector: ({ viewId, selectedJobs }: any) => (
    <div data-test-subj="mockAnomalyResultsViewSelector" data-view-id={viewId}>
      {`Jobs: ${selectedJobs.length}`}
    </div>
  ),
}));

jest.mock('../feedback_button', () => ({
  FeedBackButton: () => <div data-test-subj="mockFeedbackButton" />,
}));

jest.mock('../../capabilities/check_capabilities', () => ({
  usePermissionCheck: () => [true, true],
}));

jest.mock('../../contexts/kibana/use_create_url', () => ({
  useCreateAndNavigateToManagementMlLink: () => jest.fn(),
}));

describe('JobSelector', () => {
  const mockSelectedJobs: MlSummaryJob[] = [
    {
      id: 'job-1',
      isSingleMetricViewerJob: true,
      bucketSpanSeconds: 900,
    } as MlSummaryJob,
    {
      id: 'job-2',
      isSingleMetricViewerJob: false,
      bucketSpanSeconds: 900,
    } as MlSummaryJob,
  ];

  const defaultProps = {
    dateFormatTz: 'UTC',
    singleSelection: false,
    timeseriesOnly: false,
    selectedJobIds: ['job-1', 'job-2'],
    selectedGroups: [],
    selectedJobs: mockSelectedJobs,
  };

  it('should render AnomalyResultsViewSelector', () => {
    render(
      <I18nProvider>
        <JobSelector {...defaultProps} />
      </I18nProvider>
    );
    expect(screen.getByTestId('mockAnomalyResultsViewSelector')).toBeInTheDocument();
  });

  it('should pass viewId="explorer" to AnomalyResultsViewSelector when singleSelection is false', () => {
    render(
      <I18nProvider>
        <JobSelector {...defaultProps} singleSelection={false} />
      </I18nProvider>
    );
    const viewSelector = screen.getByTestId('mockAnomalyResultsViewSelector');
    expect(viewSelector).toHaveAttribute('data-view-id', 'explorer');
  });

  it('should pass viewId="timeseriesexplorer" to AnomalyResultsViewSelector when singleSelection is true', () => {
    render(
      <I18nProvider>
        <JobSelector {...defaultProps} singleSelection={true} />
      </I18nProvider>
    );
    const viewSelector = screen.getByTestId('mockAnomalyResultsViewSelector');
    expect(viewSelector).toHaveAttribute('data-view-id', 'timeseriesexplorer');
  });

  it('should pass selectedJobs to AnomalyResultsViewSelector', () => {
    render(
      <I18nProvider>
        <JobSelector {...defaultProps} />
      </I18nProvider>
    );
    const viewSelector = screen.getByTestId('mockAnomalyResultsViewSelector');
    expect(viewSelector).toHaveTextContent('Jobs: 2');
  });

  it('should pass empty selectedJobs array to AnomalyResultsViewSelector when no jobs selected', () => {
    render(
      <I18nProvider>
        <JobSelector {...defaultProps} selectedJobs={[]} />
      </I18nProvider>
    );
    const viewSelector = screen.getByTestId('mockAnomalyResultsViewSelector');
    expect(viewSelector).toHaveTextContent('Jobs: 0');
  });
});
