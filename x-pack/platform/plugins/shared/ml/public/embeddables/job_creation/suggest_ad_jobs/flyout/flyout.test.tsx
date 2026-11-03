/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { JOB_TYPE } from '../../../../../common/constants/new_job';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import { SuggestADJobsFlyout } from './flyout';
import type { SuggestionsState } from '../job_suggestion_service';
import { jobCloningService } from '../../../../application/services/job_cloning_service';
import { useSuggestionHistory } from '../use_suggestion_history';
import type { SuggestionRun } from '../previous_runs';

const mockState$ = new BehaviorSubject<SuggestionsState>({ status: 'loading' });
const mockSuggest = jest.fn();
const mockReload = jest.fn();
const mockCancel = jest.fn();

jest.mock('../job_suggestion_service', () => ({
  ...jest.requireActual('../job_suggestion_service'),
  JobSuggestionService: jest.fn().mockImplementation(() => ({
    get state() {
      return mockState$.getValue();
    },
    state$: mockState$.asObservable(),
    suggest: mockSuggest,
    reload: mockReload,
    cancel: mockCancel,
  })),
}));

const mockJobsApi = {};
const mockTimefilter = {};

jest.mock('../../../../application/services/ml_api_service/jobs', () => ({
  useJobsApiService: () => mockJobsApi,
}));

const mockNavigate = jest.fn();
const mockAddDanger = jest.fn();
const mockFind = jest.fn();

jest.mock('../use_suggestion_history');

jest.mock('../../../../application/contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      data: {
        dataViews: { find: mockFind },
        query: { timefilter: { timefilter: mockTimefilter } },
      },
    },
  }),
  useMlManagementLocator: () => ({ navigate: mockNavigate }),
  useNotifications: () => ({ toasts: { addDanger: mockAddDanger } }),
}));

const useSuggestionHistoryMock = jest.mocked(useSuggestionHistory);

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
  const { unmount } = render(
    <I18nProvider>
      <SuggestADJobsFlyout indexPattern="logs-*" dataViewId="dv-1" onClose={onClose} {...props} />
    </I18nProvider>
  );
  return { onClose, unmount };
};

const timeRange = { from: 'now-30d', to: 'now' };

// whether the first element comes before the second one in the page
const isBefore = (first: HTMLElement, second: HTMLElement) => {
  const elements = Array.from(document.body.querySelectorAll('*'));
  return elements.indexOf(first) < elements.indexOf(second);
};
const loaded = (suggestions: JobSuggestion[]): SuggestionsState => ({
  status: 'loaded',
  suggestions,
  timeRange,
  ranAt: Date.now(),
});

const setState = (state: SuggestionsState) => mockState$.next(state);

describe('SuggestADJobsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState$.next({ status: 'loading' });
    useSuggestionHistoryMock.mockReturnValue(undefined);
    jobCloningService.clearJobCloningData();
  });

  it('asks for suggestions for the index pattern', () => {
    setState({ status: 'loading' });
    renderFlyout();

    expect(mockSuggest).toHaveBeenCalledTimes(1);
    expect(mockSuggest).toHaveBeenCalledWith('logs-*', { from: 'now-30d', to: 'now' });
    expect(screen.getByTestId('mlSuggestADJobsLoading')).toBeInTheDocument();
  });

  it('asks again when refreshed', () => {
    setState(loaded([suggestion('a')]));
    renderFlyout();

    fireEvent.click(screen.getByTestId('superDatePickerApplyTimeButton'));

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('lists the suggestions with their title and description', () => {
    setState(
      loaded([
        suggestion('a'),
        suggestion('b', { validation: { status: 'warning', messages: [] } }),
      ])
    );
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
    setState(loaded([]));
    renderFlyout();

    expect(screen.getByTestId('mlSuggestADJobsEmpty')).toBeInTheDocument();
  });

  it('closes the flyout and opens the wizard when a suggestion is selected', async () => {
    setState(loaded([suggestion('a')]));
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
    setState(loaded([suggestion('a')]));
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
      setState(loaded([suggestion('a')]));
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
      setState(loaded([suggestion('a')]));
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

  describe('stopping the analysis', () => {
    it('has a button to stop while the analysis is running', () => {
      setState({ status: 'loading' });
      renderFlyout();

      fireEvent.click(screen.getByTestId('mlSuggestADJobsStop'));

      expect(mockCancel).toHaveBeenCalledTimes(1);
    });

    it('has no stop button once the analysis is over', () => {
      setState(loaded([suggestion('a')]));
      renderFlyout();

      expect(screen.queryByTestId('mlSuggestADJobsStop')).not.toBeInTheDocument();
    });

    it('says the analysis was stopped, and offers to run it again', () => {
      setState({ status: 'cancelled' });
      renderFlyout();

      expect(screen.getByTestId('mlSuggestADJobsCancelled')).toHaveTextContent('Analysis stopped');
      expect(screen.queryByTestId('mlSuggestADJobsLoading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mlSuggestADJobsError')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('mlSuggestADJobsRunAgain'));

      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('still shows the previous results once the analysis is stopped', () => {
      setState({ status: 'cancelled' });
      useSuggestionHistoryMock.mockReturnValue({
        timeRange: { from: 'now-7d', to: 'now' },
        ranAt: Date.now(),
        suggestions: [suggestion('old-1')],
      });
      renderFlyout();

      expect(screen.getByTestId('mlSuggestADJobsPreviousCard-old-1')).toBeInTheDocument();
    });

    it('stops the analysis when the flyout is closed', () => {
      setState({ status: 'loading' });
      const { unmount } = renderFlyout();
      expect(mockCancel).not.toHaveBeenCalled();

      unmount();

      expect(mockCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('previous results', () => {
    const previousRun = (): SuggestionRun => ({
      timeRange: { from: 'now-7d', to: 'now' },
      ranAt: Date.now() - 2 * 60 * 60 * 1000,
      suggestions: [suggestion('old-1', { title: 'Old title' }), suggestion('old-2')],
    });

    it('does not show the section when there is no previous run', () => {
      setState(loaded([suggestion('a')]));
      renderFlyout();

      expect(screen.queryByTestId('mlSuggestADJobsPrevious')).not.toBeInTheDocument();
    });

    it('asks for the previous run of the index pattern, along with the current state', () => {
      setState({ status: 'loading' });
      renderFlyout();

      expect(useSuggestionHistoryMock).toHaveBeenCalledWith('logs-*', { status: 'loading' });
    });

    it('shows the previous run below the loading text', () => {
      setState({ status: 'loading' });
      useSuggestionHistoryMock.mockReturnValue(previousRun());
      renderFlyout();

      expect(
        isBefore(
          screen.getByTestId('mlSuggestADJobsLoading'),
          screen.getByTestId('mlSuggestADJobsPrevious')
        )
      ).toBe(true);
      expect(screen.getByText('Old title')).toBeInTheDocument();
    });

    it('shows the previous run below the current results', () => {
      setState(loaded([suggestion('a')]));
      useSuggestionHistoryMock.mockReturnValue(previousRun());
      renderFlyout();

      expect(
        isBefore(
          screen.getByTestId('mlSuggestADJobsList'),
          screen.getByTestId('mlSuggestADJobsPrevious')
        )
      ).toBe(true);
      expect(screen.getByTestId('mlSuggestADJobsCard-a')).toBeInTheDocument();
      expect(screen.getByTestId('mlSuggestADJobsPreviousCard-old-1')).toBeInTheDocument();
      expect(screen.getByTestId('mlSuggestADJobsPreviousCard-old-2')).toBeInTheDocument();
    });

    it('shows the previous run when the new run fails', () => {
      setState({ status: 'error', error: 'AI features are not available.' });
      useSuggestionHistoryMock.mockReturnValue(previousRun());
      renderFlyout();

      expect(screen.getByTestId('mlSuggestADJobsError')).toBeInTheDocument();
      expect(screen.getByTestId('mlSuggestADJobsPreviousCard-old-1')).toBeInTheDocument();
    });

    it('says what time range the previous run covered and how long ago it was', () => {
      setState({ status: 'loading' });
      useSuggestionHistoryMock.mockReturnValue(previousRun());
      renderFlyout();

      expect(screen.getByTestId('mlSuggestADJobsPreviousRun')).toHaveTextContent(
        'Last 7 days, run 2 hours ago'
      );
    });

    it('opens the wizard for a suggestion of the previous run', async () => {
      setState(loaded([suggestion('a')]));
      useSuggestionHistoryMock.mockReturnValue(previousRun());
      const { onClose } = renderFlyout();

      fireEvent.click(screen.getByTestId('mlSuggestADJobsPreviousCard-old-1'));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({
        sectionId: 'ml',
        appId: 'anomaly_detection/jobs/new_job/multi_metric?index=dv-1',
      });
      expect(jobCloningService.job.job_id).toBe('job-old-1');
    });
  });
});
