/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { JOB_TYPE } from '../../../../../common/constants/new_job';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import type { SuggestionsState } from '../../../../application/components/job_suggestion/job_suggestion_service';
import { useSuggestionHistory } from '../../../../application/components/job_suggestion/use_suggestion_history';
import {
  getSelectedJobId$,
  getShowAnomalies$,
  setSelectedJobId,
  setShowAnomalies,
} from '../../../../application/components/job_suggestion/selected_job';
import { DiscoverADManagementFlyout } from './flyout';

const mockState$ = new BehaviorSubject<SuggestionsState>({ status: 'loading' });
const mockSuggest = jest.fn();
const mockReload = jest.fn();
const mockCancel = jest.fn();

jest.mock('../../../../application/components/job_suggestion/job_suggestion_service', () => ({
  ...jest.requireActual('../../../../application/components/job_suggestion/job_suggestion_service'),
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

const mockGetFullTimeRange = jest.fn();
const mockCreateAndSaveJob = jest.fn();
const mockWatchProgress = jest.fn();

jest.mock('../../../../application/jobs/new_job/job_from_suggestion', () => ({
  QuickSuggestedJobCreator: jest.fn().mockImplementation(() => ({
    getFullTimeRange: mockGetFullTimeRange,
    createAndSaveJob: mockCreateAndSaveJob,
    watchProgress: mockWatchProgress,
  })),
}));

jest.mock('../../../../application/components/job_suggestion/use_suggestion_history');

const mockJobsExist = jest.fn();
const mockJobsSummary = jest.fn();
// The same api each render, as the real context gives.
const mockMlApi = { jobs: { jobsExist: mockJobsExist, jobsSummary: mockJobsSummary } };
const mockCalculateBounds = jest.fn();

jest.mock('../../../../application/services/ml_api_service/jobs', () => ({
  useJobsApiService: () => ({}),
}));

jest.mock('../../../../application/contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      share: { url: { locators: { get: () => undefined } } },
      uiSettings: {},
      cps: undefined,
      data: {
        dataViews: {},
        query: {
          timefilter: {
            timefilter: {
              calculateBounds: mockCalculateBounds,
              getTime: () => ({ from: 'now-7d', to: 'now' }),
            },
          },
        },
      },
    },
  }),
  useMlApi: () => mockMlApi,
}));

const useSuggestionHistoryMock = jest.mocked(useSuggestionHistory);

const suggestion = (id: string): JobSuggestion => ({
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
  validation: { status: 'valid', messages: [] },
});

const loaded = (suggestions: JobSuggestion[]): SuggestionsState => ({
  status: 'loaded',
  suggestions,
  timeRange: { from: 'now-30d', to: 'now' },
  ranAt: Date.now(),
});

let mockProgress$ = new Subject<number>();

const FULL_RANGE = { start: Date.UTC(2024, 0, 1), end: Date.UTC(2024, 2, 1) };
const SUCCESS = {
  jobCreated: { success: true },
  datafeedCreated: { success: true },
  jobOpened: { success: true },
  datafeedStarted: { success: true },
};

const mockClearPreviousRun = jest.fn();
const PREVIOUS_RUN = {
  timeRange: { from: 'now-7d', to: 'now' },
  ranAt: Date.now(),
  suggestions: [suggestion('old')],
};
const history = (previousRun?: typeof PREVIOUS_RUN, isLoaded = true) => ({
  previousRun,
  isLoaded,
  clearPreviousRun: mockClearPreviousRun,
});

const renderFlyout = ({ openSuggestions = true } = {}) => {
  const onClose = jest.fn();
  render(
    <I18nProvider>
      <DiscoverADManagementFlyout indexPattern="logs-*" onClose={onClose} />
    </I18nProvider>
  );
  if (openSuggestions) {
    fireEvent.click(screen.getByTestId('mlDiscoverADManagementSuggestSection'));
  }
  return { onClose };
};

// Renders the flyout, with the suggestions open, so that it can be rendered again
const renderFlyoutForRerender = () => {
  const onClose = jest.fn();
  // a new element each time, as React doesn't render the same one again
  const createElement = () => (
    <I18nProvider>
      <DiscoverADManagementFlyout indexPattern="logs-*" onClose={onClose} />
    </I18nProvider>
  );
  const { rerender } = render(createElement());
  fireEvent.click(screen.getByTestId('mlDiscoverADManagementSuggestSection'));
  return { rerender: () => rerender(createElement()) };
};

const openConfigStep = async (id: string) => {
  fireEvent.click(screen.getByTestId(`mlDiscoverADManagementCard-${id}`));
  return screen.findByTestId('mlDiscoverADManagementConfig');
};

const enabledCreateButton = async () => {
  const button = await screen.findByTestId('mlDiscoverADManagementCreate');
  await waitFor(() => expect(button).toBeEnabled(), { timeout: 3000 });
  return button;
};

describe('DiscoverADManagementFlyout', () => {
  afterEach(() => {
    act(() => {
      setSelectedJobId('logs-*', undefined);
      setShowAnomalies('logs-*', true);
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockState$.next(loaded([suggestion('a'), suggestion('b')]));
    useSuggestionHistoryMock.mockReturnValue(history());
    mockGetFullTimeRange.mockResolvedValue(FULL_RANGE);
    mockCreateAndSaveJob.mockResolvedValue(SUCCESS);
    mockProgress$ = new Subject<number>();
    mockWatchProgress.mockReturnValue(mockProgress$.asObservable());
    mockJobsExist.mockResolvedValue({});
    mockJobsSummary.mockResolvedValue([]);
    mockCalculateBounds.mockReturnValue({
      min: { valueOf: () => FULL_RANGE.start },
      max: { valueOf: () => FULL_RANGE.end },
    });
  });

  describe('the switch to show anomalies', () => {
    it('is hidden when no job is selected', () => {
      renderFlyout({ openSuggestions: false });

      expect(screen.queryByTestId('mlDiscoverADManagementShowAnomalies')).not.toBeInTheDocument();
    });

    it('hides the anomalies without deselecting the job, and shows them again', () => {
      act(() => setSelectedJobId('logs-*', 'my-job'));
      renderFlyout({ openSuggestions: false });

      const toggle = screen.getByTestId('mlDiscoverADManagementShowAnomalies');
      expect(toggle).toBeChecked();

      fireEvent.click(toggle);
      expect(getShowAnomalies$('logs-*').getValue()).toBe(false);
      expect(getSelectedJobId$('logs-*').getValue()).toBe('my-job');
      expect(toggle).not.toBeChecked();

      fireEvent.click(toggle);
      expect(getShowAnomalies$('logs-*').getValue()).toBe(true);
    });

    it('is hidden when the job is deselected', () => {
      act(() => setSelectedJobId('logs-*', 'my-job'));
      renderFlyout({ openSuggestions: false });

      fireEvent.click(screen.getByTestId('mlDiscoverADManagementSelectedJobDeselect'));

      expect(screen.queryByTestId('mlDiscoverADManagementShowAnomalies')).not.toBeInTheDocument();
    });
  });

  it('shows only the suggestions section until it is opened, and asks for nothing', () => {
    renderFlyout({ openSuggestions: false });

    expect(screen.getByText('Suggest anomaly detection jobs')).toBeInTheDocument();
    expect(mockSuggest).not.toHaveBeenCalled();
    expect(screen.queryByText('Title a')).not.toBeInTheDocument();
  });

  it('analyzes the data automatically when there are no previous results', () => {
    renderFlyout();

    expect(mockSuggest).toHaveBeenCalledTimes(1);
    expect(mockSuggest).toHaveBeenCalledWith('logs-*', { from: 'now-30d', to: 'now' });
    expect(screen.getByText('Title a')).toBeInTheDocument();
    expect(screen.queryByTestId('mlDiscoverADManagementRun')).not.toBeInTheDocument();
  });

  it('shows the previous results, without analyzing the data, when there are some', () => {
    useSuggestionHistoryMock.mockReturnValue(history(PREVIOUS_RUN));
    renderFlyout();

    expect(mockSuggest).not.toHaveBeenCalled();
    expect(screen.getByText('Title old')).toBeInTheDocument();
    expect(screen.queryByText('Title a')).not.toBeInTheDocument();
  });

  it('waits to know whether there are previous results before it analyzes the data', () => {
    useSuggestionHistoryMock.mockReturnValue(history(undefined, false));
    const { rerender } = renderFlyoutForRerender();

    expect(mockSuggest).not.toHaveBeenCalled();

    useSuggestionHistoryMock.mockReturnValue(history(undefined, true));
    rerender();
    expect(mockSuggest).toHaveBeenCalledTimes(1);
  });

  it('does not analyze the data when the previous results are cleared', () => {
    useSuggestionHistoryMock.mockReturnValue(history(PREVIOUS_RUN));
    const { rerender } = renderFlyoutForRerender();

    fireEvent.click(screen.getByTestId('mlDiscoverADManagementClearPrevious'));
    expect(mockClearPreviousRun).toHaveBeenCalledTimes(1);

    useSuggestionHistoryMock.mockReturnValue(history(undefined));
    rerender();

    expect(screen.queryByTestId('mlDiscoverADManagementPrevious')).not.toBeInTheDocument();
    expect(mockSuggest).not.toHaveBeenCalled();
  });

  it('asks for suggestions for the index pattern, and lists them', () => {
    renderFlyout();

    expect(mockSuggest).toHaveBeenCalledWith('logs-*', { from: 'now-30d', to: 'now' });
    expect(screen.getByText('Title a')).toBeInTheDocument();
    expect(screen.getByText('Title b')).toBeInTheDocument();
  });

  it('closes from the footer', () => {
    const { onClose } = renderFlyout();

    fireEvent.click(screen.getByTestId('mlDiscoverADManagementClose'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the loading state while the analysis runs', () => {
    mockState$.next({ status: 'loading' });
    renderFlyout();

    expect(screen.getByTestId('mlDiscoverADManagementLoading')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mlDiscoverADManagementStop'));
    expect(mockCancel).toHaveBeenCalled();
  });

  describe('the section to select a job', () => {
    const jobFor = (datafeedIndices: string[]) => ({ id: 'job', description: '', datafeedIndices });

    it('is shown when there are jobs for the index', async () => {
      mockJobsSummary.mockResolvedValue([jobFor(['logs-*'])]);
      renderFlyout({ openSuggestions: false });

      expect(await screen.findByTestId('mlDiscoverADManagementCurrentSection')).toBeInTheDocument();
    });

    it('is hidden when there are no jobs for the index', async () => {
      mockJobsSummary.mockResolvedValue([jobFor(['metrics-*'])]);
      renderFlyout({ openSuggestions: false });

      await waitFor(() => expect(mockJobsSummary).toHaveBeenCalled());
      expect(screen.getByTestId('mlDiscoverADManagementSuggestSection')).toBeInTheDocument();
      expect(screen.queryByTestId('mlDiscoverADManagementCurrentSection')).not.toBeInTheDocument();
    });

    it('is shown when the jobs could not be loaded, so that it can say so', async () => {
      mockJobsSummary.mockRejectedValue(new Error('boom'));
      renderFlyout({ openSuggestions: false });

      expect(await screen.findByTestId('mlDiscoverADManagementCurrentSection')).toBeInTheDocument();
    });
  });

  it('analyzes the current time range from the error', () => {
    mockState$.next({ status: 'error', error: 'The time range has no data' });
    renderFlyout();
    mockSuggest.mockClear();

    expect(screen.getByTestId('mlDiscoverADManagementError')).toHaveTextContent(
      'The time range has no data'
    );
    fireEvent.click(screen.getByTestId('mlDiscoverADManagementUseCurrentTimeRange'));

    expect(mockSuggest).toHaveBeenCalledTimes(1);
    expect(mockSuggest).toHaveBeenCalledWith('logs-*', { from: 'now-7d', to: 'now' });
  });

  it('moves to the job configuration without creating anything', async () => {
    renderFlyout();

    await openConfigStep('a');

    expect(screen.getByTestId('mlDiscoverADManagementJobId')).toHaveValue('job-a');
    expect(mockCreateAndSaveJob).not.toHaveBeenCalled();
  });

  it('creates and starts the job over all time, in real time, by default', async () => {
    renderFlyout();
    await openConfigStep('a');

    fireEvent.change(screen.getByTestId('mlDiscoverADManagementJobId'), {
      target: { value: 'my-own-id' },
    });
    fireEvent.click(await enabledCreateButton());

    expect(await screen.findByTestId('mlDiscoverADManagementCreated')).toBeInTheDocument();
    expect(mockCreateAndSaveJob).toHaveBeenCalledWith({
      suggestion: expect.objectContaining({ id: 'a' }),
      jobId: 'my-own-id',
      timeRange: FULL_RANGE,
      startJob: true,
      runInRealTime: true,
    });
  });

  describe('adding the results of the started job to the chart', () => {
    beforeEach(() => {
      window.localStorage.clear();
      setSelectedJobId('logs-*', undefined);
    });

    it('is offered once the job is started, in place of viewing the results', async () => {
      renderFlyout();
      await openConfigStep('a');
      expect(
        screen.queryByTestId('mlDiscoverADManagementAddResultsToChart')
      ).not.toBeInTheDocument();

      fireEvent.click(await enabledCreateButton());
      await screen.findByTestId('mlDiscoverADManagementCreated');

      expect(screen.getByTestId('mlDiscoverADManagementAddResultsToChart')).toBeInTheDocument();
      expect(screen.queryByTestId('mlDiscoverADManagementViewResults')).not.toBeInTheDocument();
    });

    it('selects the new job for the chart, shows its anomalies, and closes the flyout', async () => {
      setSelectedJobId('logs-*', 'another-job');
      setShowAnomalies('logs-*', false);
      const { onClose } = renderFlyout();
      await openConfigStep('a');
      fireEvent.change(screen.getByTestId('mlDiscoverADManagementJobId'), {
        target: { value: 'my-own-id' },
      });
      fireEvent.click(await enabledCreateButton());
      await screen.findByTestId('mlDiscoverADManagementCreated');

      fireEvent.click(screen.getByTestId('mlDiscoverADManagementAddResultsToChart'));

      expect(getSelectedJobId$('logs-*').getValue()).toBe('my-own-id');
      expect(getShowAnomalies$('logs-*').getValue()).toBe(true);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('progress of the started job', () => {
    const createJob = async () => {
      renderFlyout();
      await openConfigStep('a');
      fireEvent.click(await enabledCreateButton());
      await screen.findByTestId('mlDiscoverADManagementCreated');
    };

    it('follows the job which was started over the range which it analyzes', async () => {
      await createJob();

      expect(mockWatchProgress).toHaveBeenCalledWith({
        jobId: 'job-a',
        timeRange: FULL_RANGE,
        runInRealTime: true,
      });
    });

    it('is not shown before the job is started', async () => {
      renderFlyout();
      await openConfigStep('a');

      expect(screen.queryByTestId('mlDiscoverADManagementProgress')).not.toBeInTheDocument();
      expect(mockWatchProgress).not.toHaveBeenCalled();
    });

    it('shows the progress of the job, until it has finished analyzing the data', async () => {
      await createJob();
      const progressBar = () => screen.getByTestId('mlDiscoverADManagementProgress');

      expect(progressBar()).toHaveAttribute('value', '0');
      expect(screen.getByText('Analyzing the data')).toBeInTheDocument();

      act(() => mockProgress$.next(45));
      expect(progressBar()).toHaveAttribute('value', '45');

      act(() => mockProgress$.next(100));
      expect(progressBar()).toHaveAttribute('value', '100');
      expect(screen.getByText('Finished analyzing the data')).toBeInTheDocument();
    });

    it('is not shown when the progress cannot be followed', async () => {
      await createJob();

      act(() => mockProgress$.error(new Error('boom')));

      expect(screen.queryByTestId('mlDiscoverADManagementProgress')).not.toBeInTheDocument();
      expect(screen.getByTestId('mlDiscoverADManagementCreated')).toBeInTheDocument();
    });

    it('is not shown when the job could not be started', async () => {
      mockCreateAndSaveJob.mockResolvedValue({
        ...SUCCESS,
        datafeedStarted: { success: false, error: new Error('datafeed refused') },
      });
      renderFlyout();
      await openConfigStep('a');
      fireEvent.click(await enabledCreateButton());
      await screen.findByTestId('mlDiscoverADManagementFailed');

      expect(mockWatchProgress).not.toHaveBeenCalled();
      expect(screen.queryByTestId('mlDiscoverADManagementProgress')).not.toBeInTheDocument();
    });
  });

  it('does not offer real time analysis for a custom time range', async () => {
    renderFlyout();
    await openConfigStep('a');
    expect(screen.getByTestId('mlDiscoverADManagementRealTime')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mlDiscoverADManagementCustomRange'));

    expect(screen.queryByTestId('mlDiscoverADManagementRealTime')).not.toBeInTheDocument();
    fireEvent.click(await enabledCreateButton());
    await screen.findByTestId('mlDiscoverADManagementCreated');
    expect(mockCreateAndSaveJob).toHaveBeenCalledWith(
      expect.objectContaining({ timeRange: FULL_RANGE, runInRealTime: false })
    );
  });

  it('does not allow a job id which is already used', async () => {
    mockJobsExist.mockResolvedValue({ 'job-a': { exists: true } });
    renderFlyout();
    await openConfigStep('a');

    expect(await screen.findByText(/Job ID already exists/)).toBeInTheDocument();
    expect(screen.getByTestId('mlDiscoverADManagementCreate')).toBeDisabled();
  });

  it('does not allow creating the job when the data has no time range', async () => {
    mockGetFullTimeRange.mockRejectedValue(new Error('no data'));
    renderFlyout();
    await openConfigStep('a');

    expect(await screen.findByText(/no data/)).toBeInTheDocument();
    expect(screen.getByTestId('mlDiscoverADManagementCreate')).toBeDisabled();
  });

  it('says why the job could not be created', async () => {
    mockCreateAndSaveJob.mockResolvedValue({
      ...SUCCESS,
      datafeedStarted: { success: false, error: new Error('datafeed refused') },
    });
    renderFlyout();
    await openConfigStep('a');

    fireEvent.click(await enabledCreateButton());

    const failure = await screen.findByTestId('mlDiscoverADManagementFailed');
    expect(failure).toHaveTextContent('datafeed refused');
    expect(screen.queryByTestId('mlDiscoverADManagementCreated')).not.toBeInTheDocument();
  });

  it('lists the previous run', () => {
    useSuggestionHistoryMock.mockReturnValue(history(PREVIOUS_RUN));
    renderFlyout();

    expect(screen.getByTestId('mlDiscoverADManagementPrevious')).toBeInTheDocument();
    expect(screen.getByText('Title old')).toBeInTheDocument();
  });
});
