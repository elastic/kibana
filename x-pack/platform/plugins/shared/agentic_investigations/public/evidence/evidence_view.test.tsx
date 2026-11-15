/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
  it('renders the chart followed by the Markdown description', () => {
    render(
      <EuiProvider>
        <EvidenceView evidence={{ chart, description: 'See the [runbook](https://example.com)' }} />
      </EuiProvider>
    );

    expect(screen.getByTestId('mockEvidenceChart')).toHaveTextContent('Errors by service');
    expect(screen.getByRole('link', { name: /runbook/ })).toHaveAttribute(
      'href',
      'https://example.com'
    );
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

    expect(await screen.findByTestId('mockEvidenceChart')).toBeInTheDocument();
  });
});
