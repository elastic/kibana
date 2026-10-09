/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getESQLResults } from '@kbn/esql-utils';
import { useMlKibana } from '../../../../../contexts/kibana';
import { useEsqlHistogramExecutor } from './esql_histogram_executor';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';

jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: jest.fn(),
}));

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: jest.fn(),
}));

const mockedGetESQLResults = jest.mocked(getESQLResults);
const mockedUseMlKibana = jest.mocked(useMlKibana);
const search = jest.fn();

const columns = [
  { name: 'bucket', type: 'date', userDefined: false as const },
  { name: 'avg_bytes', type: 'double', userDefined: false as const },
];

const HistogramState = () => {
  const { state } = useEsqlWizardContext();

  return (
    <output data-test-subj="mlEsqlHistogramState">
      {`${state.histogramStatus}|${state.histogramTotalRows}|${state.histogramErrorMessage ?? ''}`}
    </output>
  );
};

const SeedState = () => {
  const { setQueryState, setQueryProbeState } = useEsqlWizardContext();

  useEffect(() => {
    setQueryState({ columns, emittedTimeField: 'bucket' });
    setQueryProbeState('success');
  }, [setQueryProbeState, setQueryState]);

  return null;
};

const RefreshButton = () => {
  const { refreshTimeRange } = useEsqlWizardContext();

  return <button type="button" data-test-subj="refresh" onClick={refreshTimeRange} />;
};

const Harness = () => {
  useEsqlHistogramExecutor();

  return (
    <>
      <SeedState />
      <HistogramState />
      <RefreshButton />
    </>
  );
};

describe('useEsqlHistogramExecutor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedUseMlKibana.mockReturnValue({
      services: { data: { search: { search } } },
    } as unknown as ReturnType<typeof useMlKibana>);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('runs the histogram query and sums row counts into histogramTotalRows', async () => {
    mockedGetESQLResults.mockResolvedValue({
      response: {
        columns: [
          { name: 'esql_histogram_time', type: 'date' },
          { name: 'esql_histogram_count', type: 'long' },
        ],
        values: [
          ['2026-01-01T00:00:00.000Z', 3],
          ['2026-01-01T01:00:00.000Z', 5],
        ],
      },
    } as unknown as ReturnType<typeof getESQLResults>);

    render(
      <EsqlWizardProvider>
        <Harness />
      </EsqlWizardProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('mlEsqlHistogramState')).toHaveTextContent('success|8|');
    expect(mockedGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery: expect.stringContaining('STATS esql_histogram_count = COUNT(*) BY'),
        search,
      })
    );
  });

  it('surfaces an execution error and reports zero rows', async () => {
    mockedGetESQLResults.mockRejectedValue(new Error('esql failure'));

    render(
      <EsqlWizardProvider>
        <Harness />
      </EsqlWizardProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('mlEsqlHistogramState')).toHaveTextContent('error|0|esql failure');
  });

  it('stays idle without an emitted time field', async () => {
    const IdleHarness = () => {
      useEsqlHistogramExecutor();

      return <HistogramState />;
    };

    render(
      <EsqlWizardProvider>
        <IdleHarness />
      </EsqlWizardProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByTestId('mlEsqlHistogramState')).toHaveTextContent('idle|0|');
    expect(mockedGetESQLResults).not.toHaveBeenCalled();
  });

  it('restricts rows to the selected range with the same source-time-field filter as the output preview', async () => {
    jest.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
    mockedGetESQLResults.mockResolvedValue({
      response: { columns: [], values: [] },
    } as unknown as ReturnType<typeof getESQLResults>);

    render(
      <EsqlWizardProvider>
        <Harness />
      </EsqlWizardProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockedGetESQLResults).toHaveBeenCalledTimes(1);
    expect(mockedGetESQLResults.mock.calls[0][0].filter).toEqual({
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: '2026-09-30T11:45:00.000Z',
                lte: '2026-09-30T12:00:00.000Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    });
  });

  it('re-resolves relative times when the time range is refreshed', async () => {
    jest.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
    mockedGetESQLResults.mockResolvedValue({
      response: { columns: [], values: [] },
    } as unknown as ReturnType<typeof getESQLResults>);

    render(
      <EsqlWizardProvider>
        <Harness />
      </EsqlWizardProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(mockedGetESQLResults).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date('2026-09-30T12:30:00.000Z'));
    fireEvent.click(screen.getByTestId('refresh'));
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockedGetESQLResults).toHaveBeenCalledTimes(2);
    const refreshed = mockedGetESQLResults.mock.calls[1][0];
    expect(refreshed.esqlQuery).toContain('"2026-09-30T12:30:00.000Z"');
    expect(JSON.stringify(refreshed.filter)).toContain('2026-09-30T12:15:00.000Z');
  });
});
