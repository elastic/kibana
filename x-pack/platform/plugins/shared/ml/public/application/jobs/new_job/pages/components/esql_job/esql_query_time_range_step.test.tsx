/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { useMlApi } from '../../../../../contexts/kibana/use_ml_api_context';
import { EsqlQueryTimeRangeStep } from './esql_query_time_range_step';
import { useEsqlColumnsResolver } from './esql_columns_resolver';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';
import { GOLD_ESQL_DATAFEED_QUERY } from './gold_query';

jest.mock('../../../../../contexts/kibana/use_ml_api_context', () => ({
  useMlApi: jest.fn(),
}));

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: () => ({ services: { data: { search: { search: jest.fn() } } } }),
}));

jest.mock('./esql_histogram_executor', () => ({
  useEsqlHistogramExecutor: jest.fn(),
}));

jest.mock('./esql_histogram_chart', () => ({
  EsqlHistogramChart: () => <div data-test-subj="mlEsqlHistogramChartStub" />,
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiSuperDatePicker: ({
    start,
    end,
    onTimeChange,
  }: {
    start: string;
    end: string;
    onTimeChange: (range: { start: string; end: string; isInvalid: boolean }) => void;
  }) => (
    <>
      <button
        type="button"
        data-test-subj="mlEsqlTimeRange"
        data-start={start}
        data-end={end}
        onClick={() => onTimeChange({ start: 'now-1h', end: 'now-5m', isInvalid: false })}
      />
      <button
        type="button"
        data-test-subj="mlEsqlInvalidTimeRange"
        onClick={() => onTimeChange({ start: 'now', end: 'now-1h', isInvalid: true })}
      />
    </>
  ),
}));

const getEsqlQueryColumns = jest.fn();
const mockedUseMlApi = jest.mocked(useMlApi);

const columns = [
  { name: 'bucket', type: 'date', hasConflict: false, userDefined: false },
  { name: 'host', type: 'keyword', hasConflict: false, userDefined: false },
  { name: 'doc_count', type: 'long', hasConflict: false, userDefined: false },
  { name: 'avg_bytes', type: 'double', hasConflict: false, userDefined: false },
];

const Harness = () => {
  useEsqlColumnsResolver();

  return <EsqlQueryTimeRangeStep />;
};

const renderStep = () =>
  renderWithI18n(
    <EsqlWizardProvider>
      <Harness />
    </EsqlWizardProvider>
  );

describe('EsqlQueryTimeRangeStep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getEsqlQueryColumns.mockResolvedValue({ columns });
    mockedUseMlApi.mockReturnValue({ getEsqlQueryColumns } as unknown as ReturnType<
      typeof useMlApi
    >);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('uses the gold query by default and probes it after the debounce', async () => {
    renderStep();

    expect(screen.getByLabelText('ES|QL query')).toHaveValue(GOLD_ESQL_DATAFEED_QUERY);
    expect(getEsqlQueryColumns).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(getEsqlQueryColumns).toHaveBeenCalledWith({ query: GOLD_ESQL_DATAFEED_QUERY });
  });

  it('maps returned columns to the emitted time field selector without a DataView', async () => {
    renderStep();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlEmittedTimeField')).toHaveTextContent('bucket')
    );
    expect(getEsqlQueryColumns).toHaveBeenCalledTimes(1);
  });

  it('uses the first date_nanos column when the output has no bucket column', async () => {
    getEsqlQueryColumns.mockResolvedValue({
      columns: [
        { name: 'host', type: 'keyword', hasConflict: false, userDefined: false },
        { name: 'event_time', type: 'date_nanos', hasConflict: false, userDefined: false },
      ],
    });
    renderStep();

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlEmittedTimeField')).toHaveTextContent('event_time')
    );
  });

  it('displays the Elasticsearch error reason for a failed columns probe', async () => {
    getEsqlQueryColumns.mockRejectedValue({
      body: {
        message: 'Bad request',
        attributes: { body: { error: { reason: 'Unknown column [bytes]' } } },
        statusCode: 400,
      },
    });
    renderStep();

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(await screen.findByText('Unknown column [bytes]')).toBeInTheDocument();
  });

  it('shows a non-blocking advisory for a Discover-shaped query while continuing the columns probe', async () => {
    renderStep();

    const query = 'FROM logs-* | WHERE @timestamp > now() | SORT @timestamp | LIMIT 100';
    fireEvent.change(screen.getByTestId('mlEsqlQuery'), { target: { value: query } });

    expect(screen.getByTestId('mlEsqlQueryWarning')).toHaveTextContent(
      'Review time filter, sort, and row limit'
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(getEsqlQueryColumns).toHaveBeenLastCalledWith({ query });
    expect(screen.getByTestId('mlEsqlQuery')).not.toBeDisabled();
  });

  it('persists a valid time range picker change in wizard state', () => {
    const WizardState = () => {
      const { state } = useEsqlWizardContext();

      return (
        <output data-test-subj="mlEsqlWizardRange">{`${state.wizardStart}|${state.wizardEnd}`}</output>
      );
    };

    renderWithI18n(
      <EsqlWizardProvider>
        <Harness />
        <WizardState />
      </EsqlWizardProvider>
    );

    expect(screen.getByTestId('mlEsqlTimeRange')).toHaveAttribute('data-start', 'now-15m');
    expect(screen.getByTestId('mlEsqlTimeRange')).toHaveAttribute('data-end', 'now');
    expect(screen.getByTestId('mlEsqlWizardRange')).toHaveTextContent('now-15m|now');

    fireEvent.click(screen.getByTestId('mlEsqlTimeRange'));

    expect(screen.getByTestId('mlEsqlWizardRange')).toHaveTextContent('now-1h|now-5m');
  });

  it('keeps the previous range when the picker rejects an invalid range', () => {
    const WizardState = () => {
      const { state } = useEsqlWizardContext();

      return (
        <output data-test-subj="mlEsqlWizardRange">{`${state.wizardStart}|${state.wizardEnd}`}</output>
      );
    };

    renderWithI18n(
      <EsqlWizardProvider>
        <Harness />
        <WizardState />
      </EsqlWizardProvider>
    );

    fireEvent.click(screen.getByTestId('mlEsqlInvalidTimeRange'));

    expect(screen.getByTestId('mlEsqlWizardRange')).toHaveTextContent('now-15m|now');
  });

  it('renders the start-from-beginning action next to the time range, outside any <form>', () => {
    const { container } = renderStep();

    expect(screen.getByTestId('mlEsqlStartFromBeginningButton')).toBeInTheDocument();
    expect(container.querySelector('form')).toBeNull();
  });
});
