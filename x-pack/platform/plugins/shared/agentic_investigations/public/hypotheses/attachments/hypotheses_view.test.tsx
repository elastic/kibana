/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationHypotheses } from '../../../common/hypotheses/hypotheses';
import type { InvestigationAttachmentVariant } from '../../investigation_attachments';
import { HypothesesView } from './hypotheses_view';

jest.mock('../../evidence/evidence_chart', () => ({
  EvidenceChart: ({ chart }: { chart: { title: string } }) => (
    <div data-test-subj="mockEvidenceChart">{chart.title}</div>
  ),
}));

const document: InvestigationHypotheses = {
  id: 'doc-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  createdAt: '2026-07-28T14:00:00.000Z',
  hypotheses: [
    {
      candidate: 'The 14:00 deploy introduced a slow query',
      confidence: 0.82,
      status: 'confirmed',
      reason: 'Latency rose **with** the deploy.',
      evidence: [
        {
          description: 'p99 doubled',
          chart: {
            type: 'line',
            title: 'p99 latency',
            x_axis: { type: 'time' },
            y_axis: {},
            series: [{ name: 'checkout', points: [{ x: '2026-07-28T14:00:00Z', y: 1 }] }],
          },
        },
      ],
    },
    { candidate: 'Network saturation', confidence: 0.1, status: 'dismissed' },
  ],
};

const renderView = (
  data: InvestigationHypotheses,
  variant: InvestigationAttachmentVariant = 'details'
) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <HypothesesView document={data} variant={variant} />
      </I18nProvider>
    </EuiProvider>
  );

describe('HypothesesView', () => {
  it('renders each hypothesis with its status, confidence, reason, and evidence', () => {
    renderView(document);

    const items = screen.getAllByTestId('investigationHypothesis');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('The 14:00 deploy introduced a slow query');
    expect(
      screen.getAllByTestId('investigationHypothesisStatus').map((n) => n.textContent)
    ).toEqual(['Confirmed', 'Dismissed']);
    expect(screen.getAllByTestId('investigationHypothesisConfidence')[0]).toHaveTextContent(
      '82% confidence'
    );
    expect(screen.getByText('with').tagName).toBe('STRONG');
    expect(screen.getByTestId('mockEvidenceChart')).toHaveTextContent('p99 latency');
    expect(screen.getByText('p99 doubled')).toBeInTheDocument();
  });

  it('leaves evidence out of the inline render', () => {
    renderView(document, 'inline');

    expect(screen.getAllByTestId('investigationHypothesis')).toHaveLength(2);
    expect(screen.queryByTestId('mockEvidenceChart')).not.toBeInTheDocument();
  });

  it('shows an empty state without hypotheses', () => {
    renderView({ ...document, hypotheses: [] });

    expect(screen.getByTestId('investigationHypothesesEmpty')).toBeInTheDocument();
  });
});
