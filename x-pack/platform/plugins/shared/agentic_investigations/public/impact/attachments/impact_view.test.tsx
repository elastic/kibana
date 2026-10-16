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
import type { ImpactEntityTarget } from '@kbn/agentic-investigations-common';
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

const renderView = (
  document: Impact,
  variant: InvestigationAttachmentVariant = 'details',
  onOpenEntity?: (entity: ImpactEntityTarget) => void
) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <ImpactView document={document} variant={variant} onOpenEntity={onOpenEntity} />
      </I18nProvider>
    </EuiProvider>
  );

describe('ImpactView', () => {
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

    const rows = screen.getAllByTestId('investigationImpactEntityRow');
    expect(rows).toHaveLength(2);
    expect(screen.getByText('fin-dc-01')).toBeInTheDocument();
    expect(screen.getByText('host')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    // Plain ids open nothing, so the rows are static.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('investigationImpactSummary')).not.toBeInTheDocument();
  });

  it('styles each entity like a grouped attachment row, with the entity store icon', () => {
    renderView({
      ...base,
      entities: [
        { id: 'host-1', name: 'fin-dc-01', type: 'host' },
        { id: 'user:jsmith', name: 'jsmith' },
        { id: 'svc-1', name: 'checkout', type: 'service' },
        { id: 'thing-1', name: 'thing' },
      ],
    });

    const rows = screen.getAllByTestId('investigationImpactEntityRow');
    const iconOf = (row: HTMLElement) =>
      row.querySelector('[data-euiicon-type]')?.getAttribute('data-euiicon-type');
    expect(rows.map(iconOf)).toEqual(['storage', 'user', 'vectorTriangle', 'globe']);
    // The subtitle falls back to the type read off an Entity Store id.
    expect(
      screen.getAllByTestId('groupedAttachmentRowSubtitle').map((el) => el.textContent)
    ).toEqual(['host', 'user', 'service']);
    expect(screen.getAllByTestId('groupedAttachmentRowTitle').map((el) => el.textContent)).toEqual([
      'fin-dc-01',
      'jsmith',
      'checkout',
      'thing',
    ]);
  });

  it('opens the entity flyout when a row is clicked', () => {
    const open = jest.fn();

    renderView(
      {
        ...base,
        entities: [{ id: 'user:cfo@corp', name: 'cfo@corp', type: 'user' }],
      },
      'details',
      open
    );

    fireEvent.click(screen.getByRole('button', { name: /cfo@corp/ }));

    expect(open).toHaveBeenCalledWith({ id: 'user:cfo@corp', name: 'cfo@corp', type: 'user' });
    expect(screen.getByTestId('groupedAttachmentRowAffordance')).toHaveAttribute(
      'data-euiicon-type',
      'maximize'
    );
  });

  it('opens the flyout for an entity recorded by name when its type is a host, user, or service', () => {
    const open = jest.fn();

    renderView(
      {
        ...base,
        entities: [{ id: 'ws-finance-04', name: 'ws-finance-04', type: 'host' }],
      },
      'details',
      open
    );

    fireEvent.click(screen.getByRole('button', { name: /ws-finance-04/ }));

    expect(open).toHaveBeenCalledWith({ id: 'ws-finance-04', name: 'ws-finance-04', type: 'host' });
  });

  it('leaves a named entity as text when nothing says which flyout could open it', () => {
    const open = jest.fn();

    renderView(
      {
        ...base,
        entities: [{ id: 'checkout-service', name: 'checkout-service', type: 'generic' }],
      },
      'details',
      open
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('generic')).toBeInTheDocument();
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
    expect(screen.queryByText('Latency doubled.')).not.toBeInTheDocument();

    const row = screen.getByRole('button', { name: /payments/ });
    expect(row).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(row);

    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Latency doubled.')).toBeVisible();

    fireEvent.click(row);
    expect(screen.queryByText('Latency doubled.')).not.toBeInTheDocument();
  });

  it('expands an entity-store entity with evidence, and opens the flyout from its body', () => {
    const open = jest.fn();

    renderView(
      {
        ...base,
        entities: [
          {
            id: 'service:orders-api',
            name: 'orders-api',
            type: 'service',
            evidence: { description: 'Errors tripled.' },
          },
        ],
      },
      'details',
      open
    );

    expect(screen.queryByTestId('investigationImpactEntityFlyout')).not.toBeInTheDocument();
    expect(screen.queryByText('Errors tripled.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByText('Errors tripled.')).toBeVisible();

    fireEvent.click(screen.getByTestId('investigationImpactEntityFlyout'));
    expect(open).toHaveBeenCalledWith({
      id: 'service:orders-api',
      name: 'orders-api',
      type: 'service',
    });
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
