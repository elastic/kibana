/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  FlyoutGroupedAttachments,
  createFlyoutGroupedAttachmentsRegistry,
} from '../grouped_attachments';
import { EscalationOverviewTab } from './escalation_overview_tab';

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

describe('EscalationOverviewTab', () => {
  it('renders the summary and attachments above the linked investigations', () => {
    render(
      <EscalationOverviewTab
        summary="Escalated narrative"
        attachments={[attachment]}
        groupedAttachments={groupedAttachments}
        linkedInvestigationsContent={<div>Linked list</div>}
      />
    );

    const text = screen.getByTestId('escalationOverviewTab').textContent ?? '';
    expect(text.indexOf('Escalated narrative')).toBeLessThan(text.indexOf('Linked list'));
    expect(text.indexOf('Session cookie replayed')).toBeLessThan(text.indexOf('Linked list'));
  });

  it('shows only the linked investigations when there is no summary or attachment', () => {
    render(
      <EscalationOverviewTab
        attachments={[]}
        groupedAttachments={groupedAttachments}
        linkedInvestigationsContent={<div>Linked list</div>}
      />
    );

    expect(screen.queryByText("What's happened")).not.toBeInTheDocument();
    expect(screen.getByText('Linked list')).toBeInTheDocument();
  });
});
