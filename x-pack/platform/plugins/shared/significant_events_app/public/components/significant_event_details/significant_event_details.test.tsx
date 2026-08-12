/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { SignificantEventDetails } from './significant_event_details';

jest.mock('@kbn/esql-datagrid/public', () => ({
  ESQLDataGrid: () => null,
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

const detectionSignal = {
  type: 'detection' as const,
  stream_name: 'logs.checkout',
  description: 'Found: connection refused. Impact: checkout blocked. Verdict: confirms.',
  confirmed: true,
  collected_at: '2026-06-11T15:10:00.000Z',
  evidence: {
    esql_query: ESQL_QUERY,
    result: 'found' as const,
    time_range: {
      from: '2026-06-11T15:03:00.000Z',
      to: '2026-06-11T15:10:00.000Z',
    },
  },
  metadata: {
    rule_name: 'Connection refused in checkout',
    rule_uuid: 'rule-1',
    detection_id: 'det-1',
    change_point_type: 'spike' as const,
    p_value: 0.001,
  },
  causal_features: [],
  blast_radius: [],
};

const renderDetails = (event: SignificantEvent) =>
  render(
    <I18nProvider>
      <SignificantEventDetails event={event} />
    </I18nProvider>
  );

describe('SignificantEventDetails', () => {
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
});
