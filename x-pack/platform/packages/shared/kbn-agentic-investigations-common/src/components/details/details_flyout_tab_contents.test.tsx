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
};

const renderTab = ({
  attachments,
  renderAttachmentsOverview,
  investigationOverrides,
}: {
  attachments?: VersionedAttachment[];
  renderAttachmentsOverview?: (a: VersionedAttachment[]) => React.ReactNode;
  investigationOverrides?: Partial<Investigation>;
} = {}) =>
  render(
    <OverviewTab
      investigation={{ ...investigation, ...investigationOverrides }}
      attachments={attachments}
      renderAttachmentsOverview={renderAttachmentsOverview}
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

  it('does not render attachment summary when no renderAttachmentsOverview is provided', () => {
    renderTab({ attachments: [attachment] });

    expect(screen.queryByText('Attachment summary')).not.toBeInTheDocument();
  });

  it('calls renderAttachmentsOverview when attachments are present', () => {
    const renderAttachmentsOverview = jest.fn().mockReturnValue(<div>12 alerts</div>);
    renderTab({ attachments: [attachment], renderAttachmentsOverview });

    expect(renderAttachmentsOverview).toHaveBeenCalledWith([attachment]);
    expect(screen.getByText('12 alerts')).toBeInTheDocument();
  });

  it('does not call renderAttachmentsOverview when attachments is empty', () => {
    const renderAttachmentsOverview = jest.fn().mockReturnValue(<div>12 alerts</div>);
    renderTab({ attachments: [], renderAttachmentsOverview });

    expect(renderAttachmentsOverview).not.toHaveBeenCalled();
  });

  it('does not call renderAttachmentsOverview when attachments is undefined', () => {
    const renderAttachmentsOverview = jest.fn().mockReturnValue(<div>12 alerts</div>);
    renderTab({ attachments: undefined, renderAttachmentsOverview });

    expect(renderAttachmentsOverview).not.toHaveBeenCalled();
  });
});
