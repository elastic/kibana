/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationEvidence } from '@kbn/significant-events-schema';
import { EvidenceList } from './evidence_list';

const renderEvidence = (
  evidence: InvestigationEvidence[],
  getQueryHref?: (params: { query: { esql: string } }) => string | undefined
) =>
  render(
    <I18nProvider>
      <EvidenceList evidence={evidence} getQueryHref={getQueryHref} />
    </I18nProvider>
  );

const queryHref = () => 'http://localhost:5601/app/discover#/?_a=(query:(esql:...))';

const openableEvidence: InvestigationEvidence = {
  description: 'Pool utilization saturates at 14:02.',
  esql_query: 'FROM metrics-* | STATS max = MAX(pool.utilization)',
  time_range: { from: '2026-07-28T13:30:00Z', to: '2026-07-28T15:00:00Z' },
};

describe('EvidenceList', () => {
  it('renders nothing when there is no evidence', () => {
    const { container } = renderEvidence([]);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders each observation with its query', () => {
    renderEvidence([openableEvidence]);

    expect(screen.getByText('Pool utilization saturates at 14:02.')).toBeInTheDocument();
    expect(
      screen.getByText('FROM metrics-* | STATS max = MAX(pool.utilization)')
    ).toBeInTheDocument();
  });

  it('renders an observation that has no query at all', () => {
    renderEvidence([{ description: 'All checkout pods were in CrashLoopBackOff.' }], queryHref);

    expect(screen.getByText('All checkout pods were in CrashLoopBackOff.')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationEvidenceQueryLink')).not.toBeInTheDocument();
  });

  it('links a query to Discover when the consumer can resolve an href', () => {
    renderEvidence([openableEvidence], queryHref);

    expect(screen.getByTestId('investigationEvidenceQueryLink')).toHaveAttribute(
      'href',
      queryHref()
    );
  });

  it('opens links in a new tab so a streaming investigation is not navigated away from', () => {
    renderEvidence([openableEvidence], queryHref);

    expect(screen.getByTestId('investigationEvidenceQueryLink')).toHaveAttribute(
      'target',
      '_blank'
    );
  });

  it('still renders the query, unlinked, when no href resolver is supplied', () => {
    renderEvidence([openableEvidence]);

    expect(
      screen.getByText('FROM metrics-* | STATS max = MAX(pool.utilization)')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('investigationEvidenceQueryLink')).not.toBeInTheDocument();
  });

  it('does not link a query that has no time range, which would land on an unrelated window', () => {
    renderEvidence(
      [
        {
          description: 'Pool utilization saturates at 14:02.',
          esql_query: 'FROM metrics-* | STATS max = MAX(pool.utilization)',
        },
      ],
      queryHref
    );

    expect(screen.queryByTestId('investigationEvidenceQueryLink')).not.toBeInTheDocument();
    expect(
      screen.getByText('FROM metrics-* | STATS max = MAX(pool.utilization)')
    ).toBeInTheDocument();
  });

  it('renders one row per observation', () => {
    renderEvidence(
      [openableEvidence, { description: 'All checkout pods were in CrashLoopBackOff.' }],
      queryHref
    );

    expect(screen.getAllByTestId('investigationEvidenceItem')).toHaveLength(2);
    expect(screen.getAllByTestId('investigationEvidenceQueryLink')).toHaveLength(1);
  });
});
