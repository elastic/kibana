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
import type { EsqlQueryStepState } from './esql_query_step';
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
  queryProbeState = 'success',
  queryState,
}: {
  queryProbeState?: 'idle' | 'loading' | 'error' | 'success';
  queryState?: Partial<EsqlQueryStepState>;
}) => {
  const { setQueryProbeState, setQueryState } = useEsqlWizardContext();

  useEffect(() => {
    setQueryProbeState(queryProbeState);
    setQueryState({
      columns: [
        { name: 'bucket', type: 'date', userDefined: false },
        { name: 'avg_bytes', type: 'double', userDefined: false },
        { name: 'host', type: 'keyword', userDefined: false },
      ],
      emittedTimeField: 'bucket',
      detectorFields: ['avg_bytes'],
      influencers: ['host'],
      ...queryState,
    });
  }, [queryProbeState, queryState, setQueryProbeState, setQueryState]);

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

    fireEvent.change(screen.getByLabelText('Job ID'), { target: { value: 'esql-job-1' } });
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
      end: 'now',
    });
    expect(mockNavigateToManagement).toHaveBeenCalledWith('', { jobId: 'esql-job-1' });
  });

  it('does not call the API until a valid job ID is provided', () => {
    renderCreateFlow();

    expect(screen.getByTestId('mlEsqlCreateJobButton')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Job ID'), { target: { value: '_invalid' } });
    expect(screen.getByTestId('mlEsqlCreateJobButton')).toBeDisabled();
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  it.each([
    ['no detector', { detectorFields: [] }],
    ['missing emitted time field', { emittedTimeField: '' }],
    ['stale emitted time field', { emittedTimeField: 'removed_time' }],
  ])('disables create with %s and makes no API calls', (_description, queryState) => {
    renderCreateFlow({ queryState });

    fireEvent.change(screen.getByLabelText('Job ID'), { target: { value: 'esql-job-1' } });
    expect(screen.getByTestId('mlEsqlCreateJobButton')).toBeDisabled();
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  it.each(['loading', 'error'] as const)(
    'disables create while the query column probe is %s and makes no API calls',
    (queryProbeState) => {
      renderCreateFlow({ queryProbeState });

      fireEvent.change(screen.getByLabelText('Job ID'), { target: { value: 'esql-job-1' } });
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
    fireEvent.change(screen.getByLabelText('Job ID'), { target: { value: 'esql-job-1' } });
    const createButton = screen.getByTestId('mlEsqlCreateJobButton');
    await waitFor(() => expect(createButton).toBeEnabled());
    fireEvent.click(createButton);
    fireEvent.click(createButton);

    expect(mockAddJob).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveAddJob!();
    });
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
    'stops after failure while %s and identifies the IDs and window',
    async (phase, failingCall, reason, laterCalls) => {
      failingCall.mockRejectedValue(new Error(reason));
      renderCreateFlow();
      fireEvent.change(screen.getByLabelText('Job ID'), { target: { value: 'esql-job-1' } });
      const createButton = screen.getByTestId('mlEsqlCreateJobButton');
      await waitFor(() => expect(createButton).toBeEnabled());
      fireEvent.click(createButton);

      expect(await screen.findByText(new RegExp(phase))).toHaveTextContent(
        'job: esql-job-1, datafeed: datafeed-esql-job-1, window: now-15m to now'
      );
      laterCalls.forEach((call) => expect(call).not.toHaveBeenCalled());
    }
  );
});
