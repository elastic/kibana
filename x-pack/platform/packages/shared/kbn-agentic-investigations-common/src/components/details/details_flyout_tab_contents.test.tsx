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

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: (appId: string, options?: { path?: string }) =>
          `/app/security${options?.path ?? ''}`,
      },
    },
  }),
}));

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
  type: 'security.alerts',
  versions: [
    {
      version: 1,
      data: { alertIds: ['alert-1'] },
      created_at: '2026-09-01T10:00:00.000Z',
      content_hash: 'a',
    },
  ],
  current_version: 1,
  active: true,
};

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

  it('renders the Attachments section when attachments are present', () => {
    renderTab({ attachments: [attachment] });

    expect(screen.getByText('Attachments')).toBeInTheDocument();
  });

  it('does not render the Attachments section when attachments is empty', () => {
    renderTab({ attachments: [] });

    expect(screen.queryByText('Attachments')).not.toBeInTheDocument();
  });

  it('does not render the Attachments section when attachments is undefined', () => {
    renderTab({ attachments: undefined });

    expect(screen.queryByText('Attachments')).not.toBeInTheDocument();
  });
});
