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
      fireEvent.focus(within(screen.getByTestId('mlEsqlDetectorFields')).getByRole('combobox'));
    });
    expect(screen.getByText('doc_count')).toBeInTheDocument();
    expect(screen.getByText('avg_bytes')).toBeInTheDocument();
    expect(screen.queryByText('host')).not.toBeInTheDocument();

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

    expect(await screen.findByText('event_time')).toBeInTheDocument();
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
});
