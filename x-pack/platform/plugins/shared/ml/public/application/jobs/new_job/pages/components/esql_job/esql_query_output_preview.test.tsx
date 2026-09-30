/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { act, screen } from '@testing-library/react';
import { getESQLResults } from '@kbn/esql-utils';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { useMlKibana } from '../../../../../contexts/kibana';
import { EsqlQueryOutputPreview } from './esql_query_output_preview';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';

jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: jest.fn(),
}));

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: jest.fn(),
}));

const mockedGetESQLResults = jest.mocked(getESQLResults);
const search = jest.fn();

const response = (
  columns: Array<{ name: string; type: string }>,
  values: unknown[][]
): Awaited<ReturnType<typeof getESQLResults>> =>
  ({ response: { columns, values } } as unknown as Awaited<ReturnType<typeof getESQLResults>>);

const Seed = ({ probe = 'success' }: { probe?: 'success' | 'idle' | 'error' }) => {
  const { setQueryProbeState, setQueryState } = useEsqlWizardContext();

  useEffect(() => {
    setQueryState({ query: 'FROM logs-* | KEEP host, bytes', sourceTimeField: 'ts' });
    setQueryProbeState(probe);
  }, [probe, setQueryProbeState, setQueryState]);

  return null;
};

const renderPreview = (probe?: 'success' | 'idle' | 'error') =>
  renderWithI18n(
    <EsqlWizardProvider>
      <Seed probe={probe} />
      <EsqlQueryOutputPreview />
    </EsqlWizardProvider>
  );

const flushDebounce = () =>
  act(async () => {
    jest.advanceTimersByTime(300);
    await Promise.resolve();
  });

describe('EsqlQueryOutputPreview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(useMlKibana).mockReturnValue({
      services: { data: { search: { search } } },
    } as unknown as ReturnType<typeof useMlKibana>);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('runs the plain ES|QL query client-side for the selected time range and shows the rows', async () => {
    mockedGetESQLResults.mockResolvedValue(
      response(
        [
          { name: 'host', type: 'keyword' },
          { name: 'bytes', type: 'long' },
        ],
        [
          ['web-1', 10],
          ['web-2', 20],
        ]
      )
    );
    renderPreview();
    await flushDebounce();

    expect(mockedGetESQLResults).toHaveBeenCalledTimes(1);
    const call = mockedGetESQLResults.mock.calls[0][0];
    expect(call.esqlQuery).toContain('FROM logs-* | KEEP host, bytes');
    expect(call.search).toBe(search);
    expect(call.filter).toEqual({
      bool: {
        filter: [
          {
            range: {
              ts: {
                gte: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
                lte: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    });

    const table = await screen.findByTestId('mlEsqlQueryOutputPreviewTable');
    expect(table).toHaveTextContent('host');
    expect(table).toHaveTextContent('web-2');
    expect(table).toHaveTextContent('20');
  });

  it('does not query until the query resolved output columns', async () => {
    renderPreview('idle');
    await flushDebounce();

    expect(mockedGetESQLResults).not.toHaveBeenCalled();
    expect(screen.getByTestId('mlEsqlQueryOutputPreviewIdle')).toBeInTheDocument();
  });

  it('shows an empty message when the query returns no rows', async () => {
    mockedGetESQLResults.mockResolvedValue(response([{ name: 'host', type: 'keyword' }], []));
    renderPreview();
    await flushDebounce();

    expect(await screen.findByTestId('mlEsqlQueryOutputPreviewEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('mlEsqlQueryOutputPreviewTable')).not.toBeInTheDocument();
  });

  it('shows the Elasticsearch error reason when the query fails', async () => {
    mockedGetESQLResults.mockRejectedValue({
      body: { attributes: { body: { error: { reason: 'Unknown column [bytes]' } } } },
    });
    renderPreview();
    await flushDebounce();

    expect(await screen.findByTestId('mlEsqlQueryOutputPreviewError')).toHaveTextContent(
      'Unknown column [bytes]'
    );
  });
});
