/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
    { candidate: 'Cache eviction storm', confidence: 0.35, status: 'investigating' },
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

const toggles = () => screen.getAllByTestId('investigationHypothesisToggle');

describe('HypothesesView', () => {
  it('renders one collapsed row per hypothesis, in order, with its status icon and confidence', () => {
    renderView(document);

    const items = screen.getAllByTestId('investigationHypothesis');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Hypothesis: The 14:00 deploy introduced a slow query');
    expect(items[1]).toHaveTextContent('Hypothesis: Network saturation');
    expect(items[2]).toHaveTextContent('Hypothesis: Cache eviction storm');
    expect(
      within(items[0]).getByTestId('investigationHypothesisStatus-confirmed')
    ).toBeInTheDocument();
    expect(
      within(items[1]).getByTestId('investigationHypothesisStatus-dismissed')
    ).toBeInTheDocument();
    expect(
      within(items[2]).getByTestId('investigationHypothesisStatus-investigating')
    ).toHaveAttribute('aria-label', 'Investigating');
    expect(
      screen.getAllByTestId('investigationHypothesisConfidence').map((n) => n.textContent)
    ).toEqual(['82%', '10%', '35%']);
    toggles().forEach((toggle) => expect(toggle).toHaveAttribute('aria-expanded', 'false'));
  });

  it('expands a hypothesis to its reason and evidence', () => {
    renderView(document);

    fireEvent.click(toggles()[0]);

    expect(toggles()[0]).toHaveAttribute('aria-expanded', 'true');
    expect(toggles()[1]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('with').tagName).toBe('STRONG');
    expect(screen.getByTestId('mockEvidenceChart')).toHaveTextContent('p99 latency');
    expect(screen.getByText('p99 doubled')).toBeInTheDocument();

    fireEvent.click(toggles()[0]);

    expect(toggles()[0]).toHaveAttribute('aria-expanded', 'false');
  });

  it('says when a hypothesis has no reasoning yet', () => {
    renderView(document);

    fireEvent.click(toggles()[1]);

    expect(screen.getAllByTestId('investigationHypothesisReason')[1]).toHaveTextContent(
      'No reasoning recorded yet.'
    );
  });

  it('collapses the inline render too and leaves evidence out of it', () => {
    renderView(document, 'inline');

    expect(screen.getAllByTestId('investigationHypothesis')).toHaveLength(3);
    toggles().forEach((toggle) => expect(toggle).toHaveAttribute('aria-expanded', 'false'));

    fireEvent.click(toggles()[0]);

    expect(toggles()[0]).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('with').tagName).toBe('STRONG');
    expect(screen.queryByTestId('mockEvidenceChart')).not.toBeInTheDocument();
  });

  it('shows an empty state without hypotheses', () => {
    renderView({ ...document, hypotheses: [] });

    expect(screen.getByTestId('investigationHypothesesEmpty')).toBeInTheDocument();
  });
});
