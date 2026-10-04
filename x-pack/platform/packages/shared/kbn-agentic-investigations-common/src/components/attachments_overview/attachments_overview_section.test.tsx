/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { UnknownAttachment, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AttachmentsOverviewSection } from './attachments_overview_section';

const getSecurityAppUrl = (path: string) => `https://kibana.example${path}`;

const attachment = (
  type: string,
  id: string,
  data: unknown,
  overrides: Partial<VersionedAttachment> = {}
): VersionedAttachment => ({
  id,
  type,
  current_version: 1,
  versions: [
    {
      version: 1,
      data,
      created_at: '2026-09-01T10:00:00.000Z',
      content_hash: 'h',
    },
  ],
  ...overrides,
});

const alertsAttachment = attachment('security.alerts', 'alerts-1', { alertIds: ['alert-1'] });

const detailsDefinition = (
  renderConversationDetailsContent: AttachmentUIDefinition['renderConversationDetailsContent']
): AttachmentUIDefinition => ({
  getLabel: () => 'Attachment',
  renderConversationDetailsContent,
});

describe('AttachmentsOverviewSection', () => {
  it('renders nothing when no type has a row', () => {
    const { container } = render(
      <AttachmentsOverviewSection attachments={[]} getSecurityAppUrl={getSecurityAppUrl} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a Security app link and conversation details content', () => {
    const getAttachmentUiDefinition = jest.fn((type: string) =>
      type === 'security.investigation.timeline'
        ? detailsDefinition(({ attachment: rendered }) => (
            <button type="button">{`Timeline ${(rendered.data as { host: string }).host}`}</button>
          ))
        : undefined
    );

    render(
      <AttachmentsOverviewSection
        attachments={[
          alertsAttachment,
          attachment('security.investigation.timeline', 'timeline-1', { host: 'WKSTN-RECV01' }),
        ]}
        getSecurityAppUrl={getSecurityAppUrl}
        getAttachmentUiDefinition={getAttachmentUiDefinition}
      />
    );

    expect(screen.getByRole('heading', { name: 'Attachments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /1 alert/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/alerts?')
    );
    expect(screen.getByRole('button', { name: 'Timeline WKSTN-RECV01' })).toBeInTheDocument();
  });

  it('renders conversation details content when no Security app link applies', () => {
    render(
      <AttachmentsOverviewSection
        attachments={[attachment('security.investigation.iocs', 'iocs-1', {})]}
        getSecurityAppUrl={getSecurityAppUrl}
        getAttachmentUiDefinition={() =>
          detailsDefinition(() => <button type="button">IOCs</button>)
        }
      />
    );

    expect(screen.getByRole('button', { name: 'IOCs' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('skips a details renderer that returns nothing', () => {
    const { container } = render(
      <AttachmentsOverviewSection
        attachments={[attachment('security.investigation.timeline', 'timeline-1', {})]}
        getSecurityAppUrl={getSecurityAppUrl}
        getAttachmentUiDefinition={() => detailsDefinition(() => null)}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('skips hidden attachments', () => {
    const getAttachmentUiDefinition = jest.fn(
      (): AttachmentUIDefinition<UnknownAttachment> | undefined =>
        detailsDefinition(() => <button type="button">Timeline</button>)
    );

    const { container } = render(
      <AttachmentsOverviewSection
        attachments={[
          attachment('security.investigation.timeline', 'timeline-1', {}, { hidden: true }),
        ]}
        getSecurityAppUrl={getSecurityAppUrl}
        getAttachmentUiDefinition={getAttachmentUiDefinition}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(getAttachmentUiDefinition).not.toHaveBeenCalled();
  });
});
