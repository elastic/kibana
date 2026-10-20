/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { EvidenceChart } from '../../common/evidence';
import { EvidenceView } from './evidence_view';
import { LazyEvidenceView } from './lazy_evidence_view';

jest.mock('./evidence_chart', () => ({
  EvidenceChart: ({ chart }: { chart: { title: string } }) => (
    <div data-test-subj="mockEvidenceChart">{chart.title}</div>
  ),
}));

const chart: EvidenceChart = {
  type: 'bar',
  title: 'Errors by service',
  x_axis: { type: 'category' },
  y_axis: {},
  series: [{ name: 'errors', points: [{ x: 'checkout', y: 3 }] }],
};

describe('EvidenceView', () => {
  const expand = () => fireEvent.click(screen.getByRole('button', { name: 'Evidence' }));

  it('renders the chart followed by the Markdown description', () => {
    render(
      <EuiProvider>
        <EvidenceView evidence={{ chart, description: 'See the [runbook](https://example.com)' }} />
      </EuiProvider>
    );

    expand();

    expect(screen.getByTestId('mockEvidenceChart')).toHaveTextContent('Errors by service');
    expect(screen.getByRole('link', { name: /runbook/ })).toHaveAttribute(
      'href',
      'https://example.com'
    );
  });

  it('is collapsed by default', () => {
    render(
      <EuiProvider>
        <EvidenceView evidence={{ description: 'Hidden at first' }} />
      </EuiProvider>
    );

    expect(screen.getByRole('button', { name: 'Evidence' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByText('Hidden at first')).not.toBeVisible();

    expand();

    expect(screen.getByText('Hidden at first')).toBeVisible();
  });

  it('renders links in a new tab, with an icon for GitHub, and copyable queries', () => {
    render(
      <EuiProvider>
        <EvidenceView
          evidence={{
            references: [
              { type: 'link', url: 'https://github.com/elastic/kibana/pull/1', label: 'The PR' },
              { type: 'link', url: 'https://example.com/dash' },
              { type: 'query', language: 'esql', query: 'FROM logs-* | LIMIT 1', label: 'Logs' },
            ],
          }}
        />
      </EuiProvider>
    );
    expand();

    const [github, other] = screen.getAllByTestId('evidenceReferenceLink');
    expect(github).toHaveAttribute('href', 'https://github.com/elastic/kibana/pull/1');
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(other).toHaveAttribute('href', 'https://example.com/dash');
    expect(screen.getAllByTestId('evidenceReferenceIcon')).toHaveLength(1);
    expect(screen.getByTestId('evidenceReferenceQuery')).toHaveTextContent('FROM logs-* | LIMIT 1');
    expect(screen.getByTestId('evidenceReferenceCopyQuery')).toBeInTheDocument();
  });

  it('renders references-only evidence', () => {
    render(
      <EuiProvider>
        <EvidenceView evidence={{ references: [{ type: 'link', url: 'https://example.com' }] }} />
      </EuiProvider>
    );

    expect(screen.getByTestId('investigationEvidenceReferences')).toBeInTheDocument();
  });

  it('renders nothing for empty evidence', () => {
    const { container } = render(<EvidenceView evidence={{ description: '  ' }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('loads lazily', async () => {
    render(
      <EuiProvider>
        <LazyEvidenceView evidence={{ chart }} />
      </EuiProvider>
    );

    expect(await screen.findByRole('button', { name: 'Evidence' })).toBeInTheDocument();
    expect(screen.getByTestId('mockEvidenceChart')).toBeInTheDocument();
  });
});
