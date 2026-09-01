/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEvent, SignalEntry } from '@kbn/significant-events-schema';
import { appendLimitToQuery, getESQLResults } from '@kbn/esql-utils';
import { SignificantEventDetails } from './significant_event_details';

jest.mock('@kbn/esql-datagrid/public', () => ({
  ESQLDataGrid: () => <div data-test-subj="esqlDataGrid" />,
}));

jest.mock('@kbn/esql-utils', () => ({
  appendLimitToQuery: jest.fn((query, limit) => `${query} | LIMIT ${limit}`),
  formatESQLColumns: jest.fn(() => []),
  getESQLAdHocDataview: jest.fn(() => Promise.resolve({})),
  getESQLResults: jest.fn(() => Promise.resolve({ response: { values: [], columns: [] } })),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: jest.fn(() => ({
    core: { http: {} },
    services: {},
    dependencies: {
      start: {
        data: {
          dataViews: {},
          search: { search: jest.fn() },
        },
      },
    },
  })),
}));

const ESQL_QUERY =
  'FROM logs.checkout | WHERE @timestamp >= "2026-06-11T15:03:00Z" AND @timestamp <= "2026-06-11T15:10:00.000Z"';
const LEGACY_ESQL_QUERY = `${ESQL_QUERY} | KEEP @timestamp, body.text | SORT @timestamp ASC | LIMIT 1`;

const baseEvent: SignificantEvent = {
  '@timestamp': '2026-06-11T15:03:00.000Z',
  event_uuid: 'evt-1',
  event_id: 'checkout-outage',
  status: 'open',
  stream_names: ['logs.checkout'],
  title: 'Checkout outage',
  summary: 'Payment processing is failing.',
  severity: '60-high',
  confidence: 0.9,
  signals: [],
  causal_features: [],
  blast_radius: [],
};

const detectionSignal: SignalEntry = {
  type: 'detection',
  stream_name: 'logs.checkout',
  description: 'Found: connection refused. Impact: checkout blocked.',
  verdict: 'confirms',
  collected_at: '2026-06-11T15:10:00.000Z',
  evidence: {
    esql_query: ESQL_QUERY,
    result: 'found',
  },
  metadata: {
    rule_name: 'Connection refused in checkout',
    rule_uuid: 'rule-1',
    detection_id: 'det-1',
    change_point_type: 'spike',
    p_value: 0.001,
  },
};

const renderDetails = (event: SignificantEvent) =>
  render(
    <I18nProvider>
      <SignificantEventDetails event={event} />
    </I18nProvider>
  );

describe('SignificantEventDetails', () => {
  const appendLimitMock = jest.mocked(appendLimitToQuery);
  const getResultsMock = jest.mocked(getESQLResults);

  const toggleSignal = () => {
    fireEvent.click(screen.getByRole('button', { name: /Connection refused/ }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the ES|QL code block when evidence.esql_query is present', () => {
    renderDetails({ ...baseEvent, signals: [detectionSignal] });
    expect(screen.getByText(ESQL_QUERY)).toBeInTheDocument();
  });

  it('does not render the code block when evidence is null', () => {
    const signalNoEvidence = { ...detectionSignal, evidence: null };
    renderDetails({ ...baseEvent, signals: [signalNoEvidence] });
    expect(screen.queryByText(ESQL_QUERY)).not.toBeInTheDocument();
  });

  it('does not render the code block when there are no signals', () => {
    renderDetails(baseEvent);
    expect(screen.queryByText(ESQL_QUERY)).not.toBeInTheDocument();
  });

  it('shows loading state and renders the fetched grid', async () => {
    let resolveResults!: (value: unknown) => void;
    const pendingResults = new Promise((resolve) => {
      resolveResults = resolve;
    });
    getResultsMock.mockReturnValueOnce(pendingResults as ReturnType<typeof getESQLResults>);

    renderDetails({ ...baseEvent, signals: [detectionSignal] });
    toggleSignal();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    resolveResults({ response: { values: [], columns: [] } });
    expect(await screen.findByTestId('esqlDataGrid')).toBeInTheDocument();
    expect(appendLimitMock).toHaveBeenCalledWith(ESQL_QUERY, 5);
  });

  it('replaces a legacy query LIMIT and KEEP while retaining its SORT', async () => {
    renderDetails({
      ...baseEvent,
      signals: [
        {
          ...detectionSignal,
          evidence: { ...detectionSignal.evidence, esql_query: LEGACY_ESQL_QUERY, result: 'found' },
        },
      ],
    });
    toggleSignal();

    expect(await screen.findByTestId('esqlDataGrid')).toBeInTheDocument();
    const [queryWithoutLimit, limit] = appendLimitMock.mock.calls[0];
    expect(queryWithoutLimit).toContain('SORT @timestamp ASC');
    expect(queryWithoutLimit).not.toContain('LIMIT');
    expect(queryWithoutLimit).not.toContain('KEEP');
    expect(limit).toBe(5);
  });

  it('shows fetch errors and retries when the signal is reopened', async () => {
    getResultsMock.mockRejectedValueOnce(new Error('request failed')).mockResolvedValueOnce({
      response: { values: [], columns: [] },
      params: { query: ESQL_QUERY },
    });

    renderDetails({ ...baseEvent, signals: [detectionSignal] });
    toggleSignal();
    expect(await screen.findByText('request failed')).toBeInTheDocument();

    toggleSignal();
    toggleSignal();
    await waitFor(() => expect(getResultsMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('esqlDataGrid')).toBeInTheDocument();
  });
});
