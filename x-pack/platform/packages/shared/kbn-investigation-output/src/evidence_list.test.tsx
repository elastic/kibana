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

describe('EvidenceList code references', () => {
  const linkableCode = {
    source: 'github_connector' as const,
    repo: 'elastic/otel-demo-scenario',
    path: 'src/recommendationservice/recommendation_server.py',
    host: 'github.com',
    ref: 'f07c1da942b0c555fab6cf4eab612df1997b1329',
  };

  it('links a code reference without needing any consumer wiring', () => {
    renderEvidence([{ description: 'The acquire path has no timeout.', code: linkableCode }]);

    const link = screen.getByTestId('investigationEvidenceCodeLink');

    expect(link).toHaveAttribute(
      'href',
      'https://github.com/elastic/otel-demo-scenario/blob/f07c1da942b0c555fab6cf4eab612df1997b1329/src/recommendationservice/recommendation_server.py'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveTextContent('recommendation_server.py');
  });

  it('renders an unlinkable reference as text rather than guessing a host', () => {
    const { host, ...withoutHost } = linkableCode;

    renderEvidence([{ description: 'The acquire path has no timeout.', code: withoutHost }]);

    expect(screen.queryByTestId('investigationEvidenceCodeLink')).not.toBeInTheDocument();
    expect(screen.getByTestId('investigationEvidenceCodeText')).toHaveTextContent(
      'elastic/otel-demo-scenario/src/recommendationservice/recommendation_server.py @ f07c1da'
    );
  });

  it('links a GitHub Enterprise host', () => {
    renderEvidence([
      {
        description: 'The acquire path has no timeout.',
        code: { ...linkableCode, host: 'github.acme.com' },
      },
    ]);

    expect(screen.getByTestId('investigationEvidenceCodeLink')).toHaveAttribute(
      'href',
      'https://github.acme.com/elastic/otel-demo-scenario/blob/f07c1da942b0c555fab6cf4eab612df1997b1329/src/recommendationservice/recommendation_server.py'
    );
  });

  it('renders a code_search reference as text, whatever else it carries', () => {
    renderEvidence([
      {
        description: 'The acquire path has no timeout.',
        code: { ...linkableCode, source: 'code_search' },
      },
    ]);

    expect(screen.queryByTestId('investigationEvidenceCodeLink')).not.toBeInTheDocument();
    expect(screen.getByTestId('investigationEvidenceCodeText')).toBeInTheDocument();
  });

  it('renders both links when one observation rests on a query and a file', () => {
    renderEvidence(
      [
        {
          description: 'Errors spike at 08:40 and the handler re-raises.',
          esql_query: 'FROM logs.otel | STATS count = COUNT(*)',
          time_range: { from: '2026-08-05T08:00:00Z', to: '2026-08-05T09:10:00Z' },
          code: linkableCode,
        },
      ],
      queryHref
    );

    expect(screen.getByTestId('investigationEvidenceQueryLink')).toBeInTheDocument();
    expect(screen.getByTestId('investigationEvidenceCodeLink')).toBeInTheDocument();
    expect(screen.getAllByTestId('investigationEvidenceItem')).toHaveLength(1);
  });
});
