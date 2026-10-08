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

  it('renders the card under the heading when there is no narrative', () => {
    renderTab({ attachments: [attachment], investigationOverrides: { summary: undefined } });

    expect(screen.getByText("What's happened")).toBeInTheDocument();
    expect(screen.getByTestId('groupedAttachmentsSection')).toBeInTheDocument();
  });

  it('renders no "What\'s happened" block without a narrative or attachments', () => {
    renderTab({ attachments: [], investigationOverrides: { summary: undefined } });

    expect(screen.queryByText("What's happened")).not.toBeInTheDocument();
  });
});
