/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { EsqlCreateFlow } from './esql_create_flow';
import type { EsqlQueryStepState } from './esql_query_step_state';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';

const mockAddJob = jest.fn();
const mockAddDatafeed = jest.fn();
const mockOpenJob = jest.fn();
const mockStartDatafeed = jest.fn();
const mockNavigateToManagement = jest.fn();

jest.mock('../../../../../contexts/kibana/use_ml_api_context', () => ({
  useMlApi: () => ({
    addJob: mockAddJob,
    addDatafeed: mockAddDatafeed,
    openJob: mockOpenJob,
    startDatafeed: mockStartDatafeed,
  }),
}));

jest.mock('../../../../../contexts/kibana/use_create_url', () => ({
  useNavigateToManagementMlLink: () => mockNavigateToManagement,
}));

const ValidWizardState = ({
  jobId = 'esql-job-1',
  queryProbeState = 'success',
  queryState,
}: {
  jobId?: string;
  queryProbeState?: 'idle' | 'loading' | 'error' | 'success';
  queryState?: Partial<EsqlQueryStepState>;
}) => {
  const { setJobId, setQueryProbeState, setQueryState, setHistogramState } = useEsqlWizardContext();

  useEffect(() => {
    setJobId(jobId);
    setQueryProbeState(queryProbeState);
    setQueryState({
      columns: [
        { name: 'bucket', type: 'date', userDefined: false },
        { name: 'avg_bytes', type: 'double', userDefined: false },
        { name: 'host', type: 'keyword', userDefined: false },
      ],
      emittedTimeField: 'bucket',
      detectors: [{ function: 'mean', field: 'avg_bytes' }],
      influencers: ['host'],
      sourceTimeField: '@timestamp',
      bucketSpan: '1h',
      ...queryState,
    });
    setHistogramState({ histogramStatus: 'success', histogramTotalRows: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, queryProbeState, queryState]);

  return null;
};

const renderCreateFlow = (props?: React.ComponentProps<typeof ValidWizardState>) =>
  renderWithI18n(
    <EsqlWizardProvider>
      <ValidWizardState {...props} />
      <EsqlCreateFlow />
    </EsqlWizardProvider>
  );

describe('EsqlCreateFlow', () => {
  beforeEach(() => {
    [mockAddJob, mockAddDatafeed, mockOpenJob, mockStartDatafeed, mockNavigateToManagement].forEach(
      (mock) => mock.mockReset().mockResolvedValue({})
    );
  });

  it('creates, opens, and starts an ES|QL datafeed with the wizard range', async () => {
    renderCreateFlow();

    const createButton = screen.getByTestId('mlEsqlCreateJobButton');
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);

    await waitFor(() => expect(mockStartDatafeed).toHaveBeenCalledTimes(1));

    expect(mockAddJob.mock.invocationCallOrder[0]).toBeLessThan(
      mockAddDatafeed.mock.invocationCallOrder[0]
    );
    expect(mockAddDatafeed.mock.invocationCallOrder[0]).toBeLessThan(
      mockOpenJob.mock.invocationCallOrder[0]
    );
    expect(mockOpenJob.mock.invocationCallOrder[0]).toBeLessThan(
      mockStartDatafeed.mock.invocationCallOrder[0]
    );
    expect(mockAddJob).toHaveBeenCalledWith({
      jobId: 'esql-job-1',
      job: expect.objectContaining({
        analysis_config: expect.objectContaining({
          detectors: [{ function: 'mean', field_name: 'avg_bytes' }],
          influencers: ['host'],
        }),
        data_description: { time_field: 'bucket' },
      }),
    });
    expect(mockAddDatafeed).toHaveBeenCalledWith({
      datafeedId: 'datafeed-esql-job-1',
      datafeedConfig: expect.objectContaining({
        esql_query: expect.any(String),
        source_time_field: '@timestamp',
        grouping_interval: '1h',
      }),
    });
    const datafeed = mockAddDatafeed.mock.calls[0][0].datafeedConfig;
    expect(datafeed).not.toHaveProperty('indices');
    expect(datafeed).not.toHaveProperty('query');
    expect(datafeed).not.toHaveProperty('project_routing');
    expect(mockOpenJob).toHaveBeenCalledWith({ jobId: 'esql-job-1' });
    expect(mockStartDatafeed).toHaveBeenCalledWith({
      datafeedId: 'datafeed-esql-job-1',
      start: 'now-15m',
    });
    expect(mockStartDatafeed.mock.calls[0][0]).not.toHaveProperty('end');
    expect(mockNavigateToManagement).toHaveBeenCalledWith('', { jobId: 'esql-job-1' });
  });

  it('starts the datafeed lookback-only with the wizard end when real time is switched off', async () => {
    const DisableRealTime = () => {
      const { setContinueInRealTime } = useEsqlWizardContext();

      useEffect(() => {
        setContinueInRealTime(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return null;
    };

    renderWithI18n(
      <EsqlWizardProvider>
        <ValidWizardState />
        <DisableRealTime />
        <EsqlCreateFlow />
      </EsqlWizardProvider>
    );

    const createButton = screen.getByTestId('mlEsqlCreateJobButton');
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);

    await waitFor(() => expect(mockStartDatafeed).toHaveBeenCalledTimes(1));
    expect(mockStartDatafeed).toHaveBeenCalledWith({
      datafeedId: 'datafeed-esql-job-1',
      start: 'now-15m',
      end: 'now',
    });
  });

  it('defaults continueInRealTime to true', () => {
    let seen: boolean | undefined;
    const Probe = () => {
      seen = useEsqlWizardContext().state.continueInRealTime;
      return null;
    };
    renderWithI18n(
      <EsqlWizardProvider>
        <Probe />
      </EsqlWizardProvider>
    );

    expect(seen).toBe(true);
  });

  it('does not call the API without a valid job ID', () => {
    renderCreateFlow({ jobId: '_invalid' });

    expect(screen.getByTestId('mlEsqlCreateJobButton')).toBeDisabled();
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  it.each([
    ['no detector', { detectors: [] }],
    ['missing emitted time field', { emittedTimeField: '' }],
    ['stale emitted time field', { emittedTimeField: 'removed_time' }],
  ])('disables create with %s and makes no API calls', (_description, queryState) => {
    renderCreateFlow({ queryState });

    expect(screen.getByTestId('mlEsqlCreateJobButton')).toBeDisabled();
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  it.each(['loading', 'error'] as const)(
    'disables create while the query column probe is %s and makes no API calls',
    (queryProbeState) => {
      renderCreateFlow({ queryProbeState });

      expect(screen.getByTestId('mlEsqlCreateJobButton')).toBeDisabled();
      expect(mockAddJob).not.toHaveBeenCalled();
    }
  );

  it('prevents duplicate submits while the job request is pending', async () => {
    let resolveAddJob: () => void;
    mockAddJob.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAddJob = resolve;
        })
    );
    renderCreateFlow();
    const createButton = screen.getByTestId('mlEsqlCreateJobButton');
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);
    fireEvent.click(createButton);

    expect(mockAddJob).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveAddJob!();
    });
  });

  it('includes the summary count field and enables delayed-data checking when one is chosen', async () => {
    renderCreateFlow({
      queryState: { summaryCountFieldName: 'doc_count', delayedDataCheckEnabled: true },
    });

    const createButton = screen.getByTestId('mlEsqlCreateJobButton');
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);

    await waitFor(() => expect(mockAddJob).toHaveBeenCalledTimes(1));
    expect(mockAddJob).toHaveBeenCalledWith({
      jobId: 'esql-job-1',
      job: expect.objectContaining({
        analysis_config: expect.objectContaining({ summary_count_field_name: 'doc_count' }),
      }),
    });
    expect(mockAddDatafeed).toHaveBeenCalledWith({
      datafeedId: 'datafeed-esql-job-1',
      datafeedConfig: expect.objectContaining({
        delayed_data_check_config: { enabled: true },
      }),
    });
  });

  it('sets delayed_data_check_config.enabled to false and omits the summary count field when none is chosen', async () => {
    renderCreateFlow();

    const createButton = screen.getByTestId('mlEsqlCreateJobButton');
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);

    await waitFor(() => expect(mockAddJob).toHaveBeenCalledTimes(1));
    expect(mockAddJob.mock.calls[0][0].job.analysis_config).not.toHaveProperty(
      'summary_count_field_name'
    );
    expect(mockAddDatafeed).toHaveBeenCalledWith({
      datafeedId: 'datafeed-esql-job-1',
      datafeedConfig: expect.objectContaining({
        delayed_data_check_config: { enabled: false },
      }),
    });
  });

  it('surfaces the unwrapped Elasticsearch error reason instead of the generic HTTP status text', async () => {
    mockAddJob.mockRejectedValue({
      body: {
        message: 'Bad Request',
        attributes: {
          body: {
            error: {
              reason:
                'A job configured with a datafeed with an esql_query and delayed_data_check_config enabled must set summary_count_field_name',
            },
          },
        },
        statusCode: 400,
      },
    });
    renderCreateFlow();

    const createButton = screen.getByTestId('mlEsqlCreateJobButton');
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);

    expect(await screen.findByText(/must set summary_count_field_name/)).toBeInTheDocument();
    expect(screen.queryByText(/^Bad Request$/)).not.toBeInTheDocument();
  });

  it.each([
    [
      'creating the job',
      mockAddJob,
      'job rejected',
      [mockAddDatafeed, mockOpenJob, mockStartDatafeed],
    ],
    [
      'creating the datafeed',
      mockAddDatafeed,
      'datafeed rejected',
      [mockOpenJob, mockStartDatafeed],
    ],
    ['opening the job', mockOpenJob, 'open rejected', [mockStartDatafeed]],
    ['starting the datafeed', mockStartDatafeed, 'start rejected', []],
  ])(
    'stops after failure while %s and identifies the IDs and the real-time window (start only)',
    async (phase, failingCall, reason, laterCalls) => {
      failingCall.mockRejectedValue(new Error(reason));
      renderCreateFlow();
      const createButton = screen.getByTestId('mlEsqlCreateJobButton');
      await waitFor(() => expect(createButton).toBeEnabled());
      fireEvent.click(createButton);

      expect(await screen.findByText(new RegExp(phase))).toHaveTextContent(
        'job: esql-job-1, datafeed: datafeed-esql-job-1, window: starting at now-15m, continuing in real time'
      );
      expect(screen.getByText(new RegExp(phase))).not.toHaveTextContent('now-15m to now');
      laterCalls.forEach((call) => expect(call).not.toHaveBeenCalled());
    }
  );

  it('names both start and end in the failure message when real time is switched off', async () => {
    const DisableRealTime = () => {
      const { setContinueInRealTime } = useEsqlWizardContext();

      useEffect(() => {
        setContinueInRealTime(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return null;
    };
    mockStartDatafeed.mockRejectedValue(new Error('start rejected'));

    renderWithI18n(
      <EsqlWizardProvider>
        <ValidWizardState />
        <DisableRealTime />
        <EsqlCreateFlow />
      </EsqlWizardProvider>
    );
    const createButton = screen.getByTestId('mlEsqlCreateJobButton');
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);

    expect(await screen.findByText(/starting the datafeed/)).toHaveTextContent(
      'job: esql-job-1, datafeed: datafeed-esql-job-1, window: now-15m to now'
    );
    expect(screen.getByText(/starting the datafeed/)).not.toHaveTextContent('real time');
  });

  it('maps by/over/partition fields through to the created job detector (g2sz.10)', async () => {
    renderCreateFlow({
      queryState: {
        columns: [
          { name: 'bucket', type: 'date', userDefined: false },
          { name: 'avg_bytes', type: 'double', userDefined: false },
          { name: 'host', type: 'keyword', userDefined: false },
          { name: 'region', type: 'keyword', userDefined: false },
          { name: 'service', type: 'keyword', userDefined: false },
        ],
        detectors: [
          {
            function: 'mean',
            field: 'avg_bytes',
            byField: 'host',
            overField: 'region',
            partitionField: 'service',
          },
        ],
      },
    });

    const createButton = screen.getByTestId('mlEsqlCreateJobButton');
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);

    await waitFor(() => expect(mockAddJob).toHaveBeenCalledTimes(1));
    expect(mockAddJob).toHaveBeenCalledWith({
      jobId: 'esql-job-1',
      job: expect.objectContaining({
        analysis_config: expect.objectContaining({
          detectors: [
            expect.objectContaining({
              function: 'mean',
              field_name: 'avg_bytes',
              by_field_name: 'host',
              over_field_name: 'region',
              partition_field_name: 'service',
            }),
          ],
        }),
      }),
    });
  });

  it('disables Create for a rare detector with no by field (carry-over from g2sz.6)', async () => {
    renderCreateFlow({
      queryState: {
        detectors: [{ function: 'rare' }],
      },
    });

    expect(screen.getByTestId('mlEsqlCreateJobButton')).toBeDisabled();
  });

  it('enables Create for a rare detector once a by field is set', async () => {
    renderCreateFlow({
      queryState: {
        detectors: [{ function: 'rare', byField: 'host' }],
      },
    });

    await waitFor(() => expect(screen.getByTestId('mlEsqlCreateJobButton')).toBeEnabled());
  });

  it('includes description and groups from the job details step', async () => {
    const WithJobDetails = () => {
      const { setJobDescription, setJobGroups } = useEsqlWizardContext();

      useEffect(() => {
        setJobDescription('my esql job');
        setJobGroups(['team-a', 'team-b']);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return null;
    };

    renderWithI18n(
      <EsqlWizardProvider>
        <ValidWizardState />
        <WithJobDetails />
        <EsqlCreateFlow />
      </EsqlWizardProvider>
    );

    const createButton = screen.getByTestId('mlEsqlCreateJobButton');
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);

    await waitFor(() => expect(mockAddJob).toHaveBeenCalledTimes(1));
    expect(mockAddJob).toHaveBeenCalledWith({
      jobId: 'esql-job-1',
      job: expect.objectContaining({
        description: 'my esql job',
        groups: ['team-a', 'team-b'],
      }),
    });
  });
});
