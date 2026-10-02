/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
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
  affectedSurface: 'cfo@corp',
  severity: 'high',
  events: [],
} satisfies Investigation;

const attachment: VersionedAttachment = {
  id: 'attachment-1',
  type: 'security.alert',
  versions: [{ version: 1, data: {}, created_at: '2026-09-01T10:00:00.000Z', content_hash: 'a' }],
  current_version: 1,
  active: true,
};

const makeService = (
  renderContent?: (props: { attachment: unknown }) => React.ReactNode
): AttachmentServiceStartContract =>
  ({
    getAttachmentUiDefinition: () =>
      renderContent ? { renderConversationDetailsContent: renderContent } : undefined,
    addAttachmentType: jest.fn(),
    getClient: jest.fn(),
  } as unknown as AttachmentServiceStartContract);

const renderTab = ({
  attachments,
  attachmentsService,
  investigationOverrides,
}: {
  attachments?: VersionedAttachment[];
  attachmentsService?: AttachmentServiceStartContract;
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

  it('does not render attachments section when no attachmentsService is provided', () => {
    renderTab({ attachments: [attachment] });

    expect(screen.queryByText('Attachments')).not.toBeInTheDocument();
  });

  it('calls renderConversationDetailsContent for each visible attachment', () => {
    const renderContent = jest.fn().mockReturnValue(<span>12 alerts</span>);
    renderTab({ attachments: [attachment], attachmentsService: makeService(renderContent) });

    expect(renderContent).toHaveBeenCalledTimes(1);
    expect(screen.getByText('12 alerts')).toBeInTheDocument();
  });

  it('does not render attachment section when attachments is empty', () => {
    const renderContent = jest.fn().mockReturnValue(<span>12 alerts</span>);
    renderTab({ attachments: [], attachmentsService: makeService(renderContent) });

    expect(renderContent).not.toHaveBeenCalled();
  });

  it('does not render attachment section when attachments is undefined', () => {
    const renderContent = jest.fn().mockReturnValue(<span>12 alerts</span>);
    renderTab({ attachments: undefined, attachmentsService: makeService(renderContent) });

    expect(renderContent).not.toHaveBeenCalled();
  });

  it('skips attachments whose type has no renderConversationDetailsContent', () => {
    renderTab({ attachments: [attachment], attachmentsService: makeService(undefined) });

    expect(screen.queryByText('Attachments')).not.toBeInTheDocument();
  });
});
