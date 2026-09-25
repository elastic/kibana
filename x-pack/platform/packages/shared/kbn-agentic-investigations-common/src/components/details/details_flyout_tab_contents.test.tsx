/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Investigation } from '../../types';
import { OverviewTab } from './details_flyout_tab_contents';

const investigation = {
  id: 'investigation-1',
  template_id: 'investigation',
  title: 'Impossible travel',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  watch_id: '',
  watch_execution_id: '',
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

const attachmentsService = {
  getAttachmentUiDefinition: () => ({
    getLabel: () => 'Session cookie replayed',
    getIcon: () => 'bell',
  }),
} as unknown as AttachmentServiceStartContract;

const renderTab = ({
  attachments,
  investigationOverrides,
}: {
  attachments?: VersionedAttachment[];
  investigationOverrides?: Partial<Investigation>;
} = {}) =>
  render(
    <OverviewTab
      investigation={{ ...investigation, ...investigationOverrides }}
      attachments={attachments}
      attachmentsService={attachmentsService}
    />
  );

describe('OverviewTab', () => {
  it('no longer renders the Impact table', () => {
    renderTab({ attachments: [attachment] });

    expect(screen.queryByText('Impact')).not.toBeInTheDocument();
    expect(screen.queryByText('Compromised')).not.toBeInTheDocument();
    expect(screen.queryByText('cfo@corp')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('puts the attachment summary under the narrative', () => {
    renderTab({ attachments: [attachment] });

    const headings = screen.getAllByRole('heading').map(({ textContent }) => textContent);

    expect(headings).toEqual(["What's happened", 'Attachment summary']);
    expect(screen.getByText('Session cookie replayed')).toBeInTheDocument();
  });

  it('omits the attachment summary when nothing is attached', () => {
    renderTab({ attachments: [] });

    expect(screen.queryByText('Attachment summary')).not.toBeInTheDocument();
    expect(screen.getByText("What's happened")).toBeInTheDocument();
  });

  it('renders the attachment summary on its own when there is no narrative', () => {
    renderTab({ attachments: [attachment], investigationOverrides: { summary: undefined } });

    expect(screen.queryByText("What's happened")).not.toBeInTheDocument();
    expect(screen.getByText('Attachment summary')).toBeInTheDocument();
  });
});
