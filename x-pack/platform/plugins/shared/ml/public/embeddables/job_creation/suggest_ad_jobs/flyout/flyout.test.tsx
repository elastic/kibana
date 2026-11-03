/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { JOB_TYPE } from '../../../../../common/constants/new_job';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import { SuggestADJobsFlyout } from './flyout';
import { useJobSuggestions } from '../use_job_suggestions';
import type { SuggestionsState } from '../use_job_suggestions';
import { jobCloningService } from '../../../../application/services/job_cloning_service';

jest.mock('../use_job_suggestions', () => ({
  ...jest.requireActual('../use_job_suggestions'),
  useJobSuggestions: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockAddDanger = jest.fn();
const mockFind = jest.fn();

jest.mock('../../../../application/contexts/kibana', () => ({
  useMlKibana: () => ({ services: { data: { dataViews: { find: mockFind } } } }),
  useMlManagementLocator: () => ({ navigate: mockNavigate }),
  useNotifications: () => ({ toasts: { addDanger: mockAddDanger } }),
}));

const useJobSuggestionsMock = jest.mocked(useJobSuggestions);

const suggestion = (id: string, overrides: Partial<JobSuggestion> = {}): JobSuggestion => ({
  id,
  title: `Title ${id}`,
  description: `Description ${id}`,
  jobType: JOB_TYPE.MULTI_METRIC,
  job: {
    job_id: `job-${id}`,
    description: 'Suggested by AI.',
    analysis_config: { bucket_span: '15m', detectors: [{ function: 'count' }] },
    data_description: { time_field: '@timestamp' },
    custom_settings: { created_by: 'multi-metric-wizard' },
  },
  datafeed: {
    datafeed_id: `datafeed-job-${id}`,
    job_id: `job-${id}`,
    indices: ['logs-*'],
    query: {},
  },
  estimatedModelMemoryLimit: '12MB',
  validation: { status: 'valid', messages: [] },
  ...overrides,
});

const renderFlyout = (props: Partial<React.ComponentProps<typeof SuggestADJobsFlyout>> = {}) => {
  const onClose = jest.fn();
  render(
    <I18nProvider>
      <SuggestADJobsFlyout indexPattern="logs-*" dataViewId="dv-1" onClose={onClose} {...props} />
    </I18nProvider>
  );
  return { onClose };
};

const setState = (state: SuggestionsState) =>
  useJobSuggestionsMock.mockReturnValue({ state, reload: jest.fn() });

describe('SuggestADJobsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jobCloningService.clearJobCloningData();
  });

  it('asks for suggestions for the index pattern', () => {
    setState({ status: 'loading' });
    renderFlyout();

    expect(useJobSuggestionsMock).toHaveBeenCalledWith(
      'logs-*',
      expect.objectContaining({ from: 'now-30d', to: 'now' })
    );
    expect(screen.getByTestId('mlSuggestADJobsLoading')).toBeInTheDocument();
  });

  it('lists the suggestions with their title and description', () => {
    setState({
      status: 'loaded',
      suggestions: [
        suggestion('a'),
        suggestion('b', { validation: { status: 'warning', messages: [] } }),
      ],
    });
    renderFlyout();

    expect(screen.getByText('Title a')).toBeInTheDocument();
    expect(screen.getByText('Description a')).toBeInTheDocument();
    expect(screen.getByText('Title b')).toBeInTheDocument();
    expect(screen.getAllByText('Multi-metric')).toHaveLength(2);
    expect(screen.getAllByText('Memory: 12MB')).toHaveLength(2);
    expect(screen.getAllByText('Review needed')).toHaveLength(1);
  });

  it('shows the error when suggestions cannot be made', () => {
    setState({ status: 'error', error: 'AI features are not available.' });
    renderFlyout();

    expect(screen.getByTestId('mlSuggestADJobsError')).toHaveTextContent(
      'AI features are not available.'
    );
  });

  it('says when there are no suggestions', () => {
    setState({ status: 'loaded', suggestions: [] });
    renderFlyout();

    expect(screen.getByTestId('mlSuggestADJobsEmpty')).toBeInTheDocument();
  });

  it('closes the flyout and opens the wizard when a suggestion is selected', async () => {
    setState({ status: 'loaded', suggestions: [suggestion('a')] });
    const { onClose } = renderFlyout();

    fireEvent.click(screen.getByTestId('mlSuggestADJobsCard-a'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith({
      sectionId: 'ml',
      appId: 'anomaly_detection/jobs/new_job/multi_metric?index=dv-1',
    });
    expect(jobCloningService.job.job_id).toBe('job-a');
  });

  it('opens the wizard on the saved search when there is one', async () => {
    setState({ status: 'loaded', suggestions: [suggestion('a')] });
    renderFlyout({ dataViewId: undefined, savedSearchId: 'search-1' });

    fireEvent.click(screen.getByTestId('mlSuggestADJobsCard-a'));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith({
      sectionId: 'ml',
      appId: 'anomaly_detection/jobs/new_job/multi_metric?savedSearchId=search-1',
    });
  });

  describe('without a data view or saved search', () => {
    it('looks up the data view for the index pattern', async () => {
      setState({ status: 'loaded', suggestions: [suggestion('a')] });
      mockFind.mockResolvedValue([
        { id: 'other', getIndexPattern: () => 'logs-*,metrics-*' },
        { id: 'dv-found', getIndexPattern: () => 'logs-*' },
      ]);
      renderFlyout({ dataViewId: undefined });

      fireEvent.click(screen.getByTestId('mlSuggestADJobsCard-a'));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
      expect(mockNavigate).toHaveBeenCalledWith({
        sectionId: 'ml',
        appId: 'anomaly_detection/jobs/new_job/multi_metric?index=dv-found',
      });
    });

    it('tells the user when there is no data view and keeps the flyout open', async () => {
      setState({ status: 'loaded', suggestions: [suggestion('a')] });
      mockFind.mockResolvedValue([]);
      const { onClose } = renderFlyout({ dataViewId: undefined });

      fireEvent.click(screen.getByTestId('mlSuggestADJobsCard-a'));

      await waitFor(() => expect(mockAddDanger).toHaveBeenCalledTimes(1));
      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('There is no data view for logs-*'),
        })
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(jobCloningService.job).toBeUndefined();
    });
  });
});
