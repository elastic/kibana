/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Investigation } from '../../types';
import {
  clearImpactDetailsRenderer,
  registerImpactDetailsRenderer,
} from '../impact/impact_details_renderer';
import {
  FlyoutGroupedAttachments,
  createFlyoutGroupedAttachmentsRegistry,
} from '../grouped_attachments';
import { OverviewTab } from './details_flyout_tab_contents';

const investigation = {
  id: 'investigation-1',
  template_id: 'investigation',
  title: 'Impossible travel',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  worker_execution_ids: [],
  pendingProposalCount: 0,
  assignees: [],
  summary: 'A second sign-in replayed the same session cookie.',
  // Both fed the removed Impact table; neither should surface here any more.
  affectedSurface: 'cfo@corp',
  severity: 'high',
  events: [],
} satisfies Investigation;

const attachment: VersionedAttachment = {
  id: 'attachment-1',
  type: 'security.alert',
  versions: [{ version: 1, data: {}, created_at: '2026-09-01T10:00:00.000Z', content_hash: 'a' }],
  current_version: 1,
};

const groupedAttachments = createFlyoutGroupedAttachmentsRegistry();
groupedAttachments.register(FlyoutGroupedAttachments.ALERTS, ['security.alert'], () => (
  <li>Session cookie replayed</li>
));

const renderTab = ({
  attachments,
  investigationOverrides,
  proposedActionsContent,
  proposedActionsCount,
}: {
  attachments?: VersionedAttachment[];
  investigationOverrides?: Partial<Investigation>;
  proposedActionsContent?: React.ReactNode;
  proposedActionsCount?: React.ReactNode;
} = {}) =>
  render(
    <OverviewTab
      investigation={{ ...investigation, ...investigationOverrides }}
      attachments={attachments}
      groupedAttachments={groupedAttachments}
      proposedActionsContent={proposedActionsContent}
      proposedActionsCount={proposedActionsCount}
    />
  );

describe('OverviewTab', () => {
  afterEach(() => {
    clearImpactDetailsRenderer();
  });

  it('shows the host-supplied count of proposals beside the "Proposed actions" heading', () => {
    renderTab({
      proposedActionsContent: <div>Rows</div>,
      proposedActionsCount: <span data-test-subj="count">3</span>,
    });

    const heading = screen.getByRole('heading', { name: 'Proposed actions' });
    expect(heading.closest('[class*="euiFlexGroup"]')).toContainElement(
      screen.getByTestId('count')
    );
  });

  it('renders the heading without a count when the host supplies none', () => {
    renderTab({ proposedActionsContent: <div>Rows</div> });

    expect(screen.getByRole('heading', { name: 'Proposed actions' })).toBeInTheDocument();
    expect(screen.queryByTestId('count')).not.toBeInTheDocument();
  });

  it('no longer renders the Impact table', () => {
    renderTab({ attachments: [attachment] });

    expect(screen.queryByText('Impact')).not.toBeInTheDocument();
    expect(screen.queryByText('Compromised')).not.toBeInTheDocument();
    expect(screen.queryByText('cfo@corp')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders a hidden impact attachment as its own section', () => {
    registerImpactDetailsRenderer(() => <div>Checkout failed for 30% of requests.</div>);

    renderTab({
      attachments: [
        {
          ...attachment,
          id: 'impact-1',
          type: 'investigation_impact',
          hidden: true,
        },
      ],
    });

    expect(screen.getByRole('heading', { name: 'Impact' })).toBeInTheDocument();
    expect(screen.getByText('Checkout failed for 30% of requests.')).toBeInTheDocument();
    expect(screen.queryByTestId('groupedAttachmentsSection')).not.toBeInTheDocument();
  });

  it('shows a host-supplied impact instead of the impact attachment, under one heading', () => {
    registerImpactDetailsRenderer(() => <div>from the attachment</div>);

    render(
      <OverviewTab
        investigation={investigation}
        attachments={[
          { ...attachment, id: 'impact-1', type: 'investigation_impact', hidden: true },
        ]}
        groupedAttachments={groupedAttachments}
        sections={{ impact: <span>from the query API</span> }}
      />
    );

    expect(screen.getAllByRole('heading', { name: 'Impact' })).toHaveLength(1);
    expect(screen.getByText('from the query API')).toBeInTheDocument();
    expect(screen.queryByText('from the attachment')).not.toBeInTheDocument();
  });

  it('puts the grouped attachments under the narrative, inside "What\'s happened"', () => {
    renderTab({ attachments: [attachment] });

    expect(screen.getAllByRole('heading').map(({ textContent }) => textContent)).toEqual([
      "What's happened",
    ]);
    expect(screen.getByText('Session cookie replayed')).toBeInTheDocument();
  });

  it('omits the card when nothing is attached', () => {
    renderTab({ attachments: [] });

    expect(screen.queryByTestId('groupedAttachmentsSection')).not.toBeInTheDocument();
    expect(screen.getByText("What's happened")).toBeInTheDocument();
  });

  it('renders the card on its own when there is no narrative', () => {
    renderTab({ attachments: [attachment], investigationOverrides: { summary: undefined } });

    expect(screen.queryByText("What's happened")).not.toBeInTheDocument();
    expect(screen.getByTestId('groupedAttachmentsSection')).toBeInTheDocument();
  });

  it('renders the host sections in order and only those supplied', () => {
    render(
      <OverviewTab
        investigation={investigation}
        attachments={[attachment]}
        groupedAttachments={groupedAttachments}
        proposedActionsContent={<span>proposal</span>}
        sections={{
          subjects: <span>checkout alert</span>,
          impact: <span>checkout is down</span>,
          conclusion: 'A **bad** deploy.',
          trace: <span>hypotheses</span>,
        }}
      />
    );

    const headings = screen.getAllByRole('heading').map(({ textContent }) => textContent);
    expect(headings).toEqual([
      'Subject',
      "What's happened",
      'Impact',
      'Conclusion',
      'Proposed actions',
      'Investigation trace',
    ]);
    expect(screen.getByTestId('groupedAttachmentsSection')).toBeInTheDocument();
    expect(screen.getByText('bad')).toBeInTheDocument();
  });

  it('leaves out the sections an investigation has no data for', () => {
    renderTab({ attachments: [] });

    expect(screen.queryByText('Subject')).not.toBeInTheDocument();
    expect(screen.queryByText('Impact')).not.toBeInTheDocument();
    expect(screen.queryByText('Conclusion')).not.toBeInTheDocument();
    expect(screen.queryByText('Investigation trace')).not.toBeInTheDocument();
  });
});
