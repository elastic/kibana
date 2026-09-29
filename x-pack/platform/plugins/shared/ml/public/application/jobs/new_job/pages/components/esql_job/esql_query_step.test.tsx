/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { useMlApi } from '../../../../../contexts/kibana/use_ml_api_context';
import { EsqlQueryStep } from './esql_query_step';
import { GOLD_ESQL_DATAFEED_QUERY } from './gold_query';

jest.mock('../../../../../contexts/kibana/use_ml_api_context', () => ({
  useMlApi: jest.fn(),
}));

const getEsqlQueryColumns = jest.fn();
const mockedUseMlApi = jest.mocked(useMlApi);

const columns = [
  { name: 'bucket', type: 'date', hasConflict: false, userDefined: false },
  { name: 'host', type: 'keyword', hasConflict: false, userDefined: false },
  { name: 'doc_count', type: 'long', hasConflict: false, userDefined: false },
  { name: 'avg_bytes', type: 'double', hasConflict: false, userDefined: false },
];

describe('EsqlQueryStep', () => {
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
    renderWithI18n(<EsqlQueryStep />);

    expect(screen.getByLabelText('ES|QL query')).toHaveValue(GOLD_ESQL_DATAFEED_QUERY);
    expect(getEsqlQueryColumns).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(getEsqlQueryColumns).toHaveBeenCalledWith({ query: GOLD_ESQL_DATAFEED_QUERY });
  });

  it('maps returned columns to selectors without a DataView or field caps', async () => {
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlEmittedTimeField')).toHaveTextContent('bucket')
    );
    expect(getEsqlQueryColumns).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.focus(within(screen.getByTestId('mlEsqlDetectorField-0')).getByRole('combobox'));
    });
    const detectorFieldListbox = screen.getByRole('listbox');
    expect(within(detectorFieldListbox).getByText('doc_count')).toBeInTheDocument();
    expect(within(detectorFieldListbox).getByText('avg_bytes')).toBeInTheDocument();
    expect(within(detectorFieldListbox).queryByText('host')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.focus(within(screen.getByTestId('mlEsqlInfluencers')).getByRole('combobox'));
    });
    expect(screen.getAllByText('bucket')).not.toHaveLength(0);
    expect(screen.getAllByText('host')).not.toHaveLength(0);
    expect(screen.getAllByText('doc_count')).not.toHaveLength(0);
    expect(screen.getAllByText('avg_bytes')).not.toHaveLength(0);
  });

  it('uses the first date_nanos column when the output has no bucket column', async () => {
    getEsqlQueryColumns.mockResolvedValue({
      columns: [
        { name: 'host', type: 'keyword', hasConflict: false, userDefined: false },
        { name: 'event_time', type: 'date_nanos', hasConflict: false, userDefined: false },
      ],
    });
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlEmittedTimeField')).toHaveTextContent('event_time')
    );
  });

  it('uses the first date column when the output has no bucket column', async () => {
    getEsqlQueryColumns.mockResolvedValue({
      columns: [
        { name: 'host', type: 'keyword', hasConflict: false, userDefined: false },
        { name: 'event_time', type: 'date', hasConflict: false, userDefined: false },
      ],
    });
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlEmittedTimeField')).toHaveTextContent('event_time')
    );
  });

  it('keeps source time field and bucket span explicit and distinct from emitted time', () => {
    renderWithI18n(<EsqlQueryStep />);

    expect(screen.getByTestId('mlEsqlSourceTimeField')).toHaveValue('@timestamp');
    expect(screen.getByTestId('mlEsqlBucketSpan')).toHaveValue('1h');
    fireEvent.change(screen.getByTestId('mlEsqlSourceTimeField'), {
      target: { value: 'event.ingested' },
    });
    fireEvent.change(screen.getByTestId('mlEsqlBucketSpan'), { target: { value: '15m' } });
    expect(screen.getByTestId('mlEsqlSourceTimeField')).toHaveValue('event.ingested');
    expect(screen.getByTestId('mlEsqlBucketSpan')).toHaveValue('15m');
    expect(screen.getByTestId('mlEsqlEmittedTimeField')).not.toHaveTextContent('@timestamp');
  });

  it('suppresses a stale response when the query changes', async () => {
    let resolveFirst: (value: { columns: typeof columns }) => void;
    const firstRequest = new Promise<{ columns: typeof columns }>((resolve) => {
      resolveFirst = resolve;
    });
    getEsqlQueryColumns.mockReturnValueOnce(firstRequest).mockResolvedValueOnce({
      columns: [
        { name: 'new_bucket', type: 'date', hasConflict: false, userDefined: false },
        { name: 'new_count', type: 'long', hasConflict: false, userDefined: false },
      ],
    });
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });
    fireEvent.change(screen.getByTestId('mlEsqlQuery'), { target: { value: 'FROM new-logs' } });
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlEmittedTimeField')).toHaveTextContent('new_bucket')
    );
    await act(async () => {
      resolveFirst!({ columns });
    });

    expect(screen.getByTestId('mlEsqlEmittedTimeField')).toHaveTextContent('new_bucket');
  });

  it('displays the Elasticsearch error reason', async () => {
    getEsqlQueryColumns.mockRejectedValue({
      body: {
        message: 'Bad request',
        attributes: { body: { error: { reason: 'Unknown column [bytes]' } } },
        statusCode: 400,
      },
    });
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(await screen.findByText('Unknown column [bytes]')).toBeInTheDocument();
  });

  it('shows a non-blocking advisory for a Discover-shaped query while continuing the columns probe', async () => {
    renderWithI18n(<EsqlQueryStep />);

    const query = 'FROM logs-* | WHERE @timestamp > now() | SORT @timestamp | LIMIT 100';
    fireEvent.change(screen.getByTestId('mlEsqlQuery'), { target: { value: query } });

    expect(screen.getByTestId('mlEsqlQueryWarning')).toHaveTextContent(
      'Review time filter, sort, and row limit'
    );
    expect(screen.getByTestId('mlEsqlQueryWarning')).toHaveTextContent(
      'Remove the conflicting clauses if you want the datafeed to apply its time range, ordering, and safety limit.'
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(getEsqlQueryColumns).toHaveBeenLastCalledWith({ query });
    expect(screen.getByTestId('mlEsqlQuery')).not.toBeDisabled();
  });

  it('uses localized conjunction formatting for one and two advisory clauses', () => {
    renderWithI18n(<EsqlQueryStep />);

    fireEvent.change(screen.getByTestId('mlEsqlQuery'), {
      target: { value: 'FROM logs-* | LIMIT 100' },
    });
    expect(screen.getByTestId('mlEsqlQueryWarning')).toHaveTextContent('Review row limit');

    fireEvent.change(screen.getByTestId('mlEsqlQuery'), {
      target: { value: 'FROM logs-* | WHERE @timestamp > now() | LIMIT 100' },
    });
    expect(screen.getByTestId('mlEsqlQueryWarning')).toHaveTextContent(
      'Review time filter and row limit'
    );
  });

  it('defaults the summary count field to a COUNT(*)-shaped column and turns on delayed-data checking', async () => {
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlSummaryCountField')).toHaveTextContent('doc_count')
    );
    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeChecked();
    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeEnabled();
  });

  it('leaves the summary count field unset and forces delayed-data checking off with no count-shaped column', async () => {
    getEsqlQueryColumns.mockResolvedValue({
      columns: [
        { name: 'bucket', type: 'date', hasConflict: false, userDefined: false },
        { name: 'host', type: 'keyword', hasConflict: false, userDefined: false },
        { name: 'avg_bytes', type: 'double', hasConflict: false, userDefined: false },
      ],
    });
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlEmittedTimeField')).toHaveTextContent('bucket')
    );
    expect(screen.getByTestId('mlEsqlSummaryCountField')).toHaveTextContent('');
    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).not.toBeChecked();
    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeDisabled();
  });

  it('lets the user manually turn delayed-data checking off while a summary count field is selected', async () => {
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeChecked());

    fireEvent.click(screen.getByTestId('mlEsqlDelayedDataCheckToggle'));

    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).not.toBeChecked();
    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeEnabled();
    expect(screen.getByTestId('mlEsqlSummaryCountField')).toHaveTextContent('doc_count');
  });

  it('re-enables delayed-data checking by default when a different summary count field is picked', async () => {
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlSummaryCountField')).toHaveTextContent('doc_count')
    );

    await act(async () => {
      fireEvent.focus(within(screen.getByTestId('mlEsqlSummaryCountField')).getByRole('combobox'));
    });
    fireEvent.click(within(screen.getByRole('listbox')).getByText('avg_bytes'));

    expect(screen.getByTestId('mlEsqlSummaryCountField')).toHaveTextContent('avg_bytes');
    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeChecked();
  });

  it('seeds a default mean detector on the first numeric non-count column after the columns resolve', async () => {
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );
    expect(screen.queryByTestId('mlEsqlDetectorSummary-1')).not.toBeInTheDocument();
  });

  it('seeds no detector when there is no numeric non-count column', async () => {
    getEsqlQueryColumns.mockResolvedValue({
      columns: [
        { name: 'bucket', type: 'date', hasConflict: false, userDefined: false },
        { name: 'host', type: 'keyword', hasConflict: false, userDefined: false },
        { name: 'doc_count', type: 'long', hasConflict: false, userDefined: false },
      ],
    });
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlEmittedTimeField')).toHaveTextContent('bucket')
    );
    expect(screen.queryByTestId('mlEsqlDetectorSummary-0')).not.toBeInTheDocument();
  });

  it('changes the detector function and updates the visible summary', async () => {
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );

    fireEvent.change(screen.getByTestId('mlEsqlDetectorFunction-0'), {
      target: { value: 'sum' },
    });

    expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('sum(avg_bytes)');
  });

  it('clears the field and disables the field selector for a function that does not take one', async () => {
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );

    fireEvent.change(screen.getByTestId('mlEsqlDetectorFunction-0'), {
      target: { value: 'count' },
    });

    expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('count()');
    expect(screen.queryByTestId('mlEsqlDetectorField-0')).not.toBeInTheDocument();
  });

  it('adds and removes detector rows', async () => {
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );

    fireEvent.click(screen.getByTestId('mlEsqlAddDetectorButton'));
    expect(screen.getByTestId('mlEsqlDetectorSummary-1')).toHaveTextContent('mean()');

    fireEvent.click(screen.getByTestId('mlEsqlRemoveDetectorButton-1'));
    expect(screen.queryByTestId('mlEsqlDetectorSummary-1')).not.toBeInTheDocument();
  });

  it('forces delayed-data checking off when the summary count field is cleared', async () => {
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeChecked());

    await act(async () => {
      fireEvent.focus(within(screen.getByTestId('mlEsqlSummaryCountField')).getByRole('combobox'));
    });
    fireEvent.click(
      within(screen.getByTestId('mlEsqlSummaryCountField')).getByTestId('comboBoxClearButton')
    );

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).not.toBeChecked()
    );
    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeDisabled();
  });

  it('does not update state when an in-flight request resolves after unmount', async () => {
    let resolveRequest: (value: { columns: typeof columns }) => void;
    const request = new Promise<{ columns: typeof columns }>((resolve) => {
      resolveRequest = resolve;
    });
    getEsqlQueryColumns.mockReturnValueOnce(request);
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const { unmount } = renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });
    unmount();
    await act(async () => {
      resolveRequest!({ columns });
      await Promise.resolve();
    });

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('prunes a by_field and an influencer that disappear on a query edit, keeping the surviving detector field', async () => {
    renderWithI18n(<EsqlQueryStep />);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );

    // Select 'host' as the by field and as an influencer.
    const byFieldInput = screen.getByTestId('mlEsqlDetectorByField-0').querySelector('input')!;
    fireEvent.change(byFieldInput, { target: { value: 'host' } });
    fireEvent.keyDown(byFieldInput, { key: 'Enter', code: 'Enter' });

    const influencersInput = screen.getByTestId('mlEsqlInfluencers').querySelector('input')!;
    fireEvent.change(influencersInput, { target: { value: 'host' } });
    fireEvent.keyDown(influencersInput, { key: 'Enter', code: 'Enter' });

    // Editing the query drops 'host' from the resolved output.
    getEsqlQueryColumns.mockResolvedValue({
      columns: [
        { name: 'bucket', type: 'date', hasConflict: false, userDefined: false },
        { name: 'doc_count', type: 'long', hasConflict: false, userDefined: false },
        { name: 'avg_bytes', type: 'double', hasConflict: false, userDefined: false },
      ],
    });
    fireEvent.change(screen.getByTestId('mlEsqlQuery'), {
      target: { value: 'FROM logs-* | STATS avg_bytes = AVG(bytes) BY bucket' },
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // The detector survives (its field_name, avg_bytes, still resolves) but
    // its now-invalid by_field is dropped rather than the whole row.
    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );
    expect(screen.getByTestId('mlEsqlDetectorByField-0').querySelector('input')).toHaveValue('');
    expect(
      within(screen.getByTestId('mlEsqlInfluencers')).queryByText('host')
    ).not.toBeInTheDocument();
  });
});
