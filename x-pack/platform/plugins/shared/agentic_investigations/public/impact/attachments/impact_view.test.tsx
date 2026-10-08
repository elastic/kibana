/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import {
  clearImpactEntityOpener,
  registerImpactEntityOpener,
} from '@kbn/agentic-investigations-common';
import type { Impact } from '../../../common/impact/impact';
import type { InvestigationAttachmentVariant } from '../../investigation_attachments';
import { ImpactView } from './impact_view';

jest.mock('../../evidence/evidence_chart', () => ({
  EvidenceChart: ({ chart }: { chart: { title: string } }) => (
    <div data-test-subj="mockEvidenceChart">{chart.title}</div>
  ),
}));

const base: Impact = {
  id: 'impact-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  createdAt: '2026-09-01T00:00:00.000Z',
};

const chart = {
  type: 'line' as const,
  title: 'Checkout error rate',
  x_axis: { type: 'time' as const },
  y_axis: {},
  series: [{ name: 'checkout', points: [{ x: '2026-07-28T14:00:00Z', y: 1 }] }],
};

const renderView = (document: Impact, variant: InvestigationAttachmentVariant = 'details') =>
  render(
    <EuiProvider>
      <I18nProvider>
        <ImpactView document={document} variant={variant} />
      </I18nProvider>
    </EuiProvider>
  );

describe('ImpactView', () => {
  afterEach(() => {
    clearImpactEntityOpener();
  });

  it('renders the summary as Markdown and the top-level evidence chart', () => {
    renderView({
      ...base,
      summary: 'Checkout failed for **12%** of users',
      evidence: { description: 'Errors rose after the deploy.', chart },
    });

    expect(screen.getByTestId('investigationImpactSummary')).toHaveTextContent(
      'Checkout failed for 12% of users'
    );
    expect(screen.getByText('12%').tagName).toBe('STRONG');
    expect(screen.getByTestId('mockEvidenceChart')).toHaveTextContent('Checkout error rate');
    expect(screen.getByText('Errors rose after the deploy.')).toBeInTheDocument();
  });

  it('renders an entity list in the details flyout when impact is entities only', () => {
    renderView({
      ...base,
      entities: [
        { id: 'host-1', name: 'fin-dc-01', type: 'host' },
        { id: 'user-1', type: 'user' },
      ],
    });

    expect(screen.getAllByTestId('investigationImpactEntityRow')).toHaveLength(2);
    expect(screen.getByText('fin-dc-01')).toBeInTheDocument();
    expect(screen.getByText('· host')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
    expect(screen.getByText('· user')).toBeInTheDocument();
    expect(screen.queryByTestId('investigationImpactEntityFlyout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('investigationImpactSummary')).not.toBeInTheDocument();
  });

  it('opens the entity flyout when a row is clicked', () => {
    const open = jest.fn();
    registerImpactEntityOpener(open);

    renderView({
      ...base,
      entities: [{ id: 'user:cfo@corp', name: 'cfo@corp', type: 'user' }],
    });

    fireEvent.click(screen.getByTestId('investigationImpactEntityFlyout'));

    expect(open).toHaveBeenCalledWith({ id: 'user:cfo@corp', name: 'cfo@corp', type: 'user' });
  });

  it('leaves a named entity as text when it is not an entity-store id', () => {
    const open = jest.fn();
    registerImpactEntityOpener(open);

    renderView({
      ...base,
      entities: [{ id: 'checkout-service', name: 'checkout-service', type: 'service' }],
    });

    expect(screen.queryByTestId('investigationImpactEntityFlyout')).not.toBeInTheDocument();
    expect(screen.getByText('· service')).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });

  it('keeps per-entity evidence collapsed until the row is opened', () => {
    renderView({
      ...base,
      summary: 'Two services degraded',
      entities: [
        { id: 'svc-a', name: 'checkout', evidence: { chart } },
        { id: 'svc-b', name: 'payments', evidence: { description: 'Latency doubled.' } },
      ],
    });

    expect(screen.getAllByTestId('investigationImpactEntityRow')).toHaveLength(2);
    expect(screen.queryByText('Latency doubled.')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /payments/ }));

    expect(screen.getByText('Latency doubled.')).toBeVisible();
  });

  it('keeps the inline render to entity badges', () => {
    renderView(
      {
        ...base,
        entities: [
          { id: 'svc-a', name: 'checkout', evidence: { description: 'Latency doubled.' } },
        ],
      },
      'inline'
    );

    expect(screen.getByText('checkout')).toBeInTheDocument();
    expect(screen.queryByText('Latency doubled.')).not.toBeInTheDocument();
  });

  it('says so when nothing has been recorded', () => {
    renderView({ ...base, entities: [] });

    expect(screen.getByTestId('investigationImpactEmpty')).toBeInTheDocument();
  });
});
