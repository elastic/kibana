/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  FlyoutGroupedAttachments,
  createFlyoutGroupedAttachmentsRegistry,
} from '../grouped_attachments';
import { WhatsHappenedBlock } from './whats_happened_block';

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

describe('WhatsHappenedBlock', () => {
  it('renders the summary and the attachments under one heading', () => {
    render(
      <WhatsHappenedBlock
        summary="A second sign-in replayed the cookie."
        attachments={[attachment]}
        groupedAttachments={groupedAttachments}
      />
    );

    expect(screen.getAllByRole('heading').map(({ textContent }) => textContent)).toEqual([
      "What's happened",
    ]);
    expect(screen.getByText('A second sign-in replayed the cookie.')).toBeInTheDocument();
    expect(screen.getByText('Session cookie replayed')).toBeInTheDocument();
  });

  it('renders the attachments alone under the heading', () => {
    render(
      <WhatsHappenedBlock attachments={[attachment]} groupedAttachments={groupedAttachments} />
    );

    expect(screen.getByText("What's happened")).toBeInTheDocument();
    expect(screen.getByTestId('groupedAttachmentsSection')).toBeInTheDocument();
  });

  it('renders the summary alone under the heading', () => {
    render(
      <WhatsHappenedBlock
        summary="Only a narrative"
        attachments={[]}
        groupedAttachments={groupedAttachments}
      />
    );

    expect(screen.getByText("What's happened")).toBeInTheDocument();
    expect(screen.queryByTestId('groupedAttachmentsSection')).not.toBeInTheDocument();
  });

  it('renders nothing without a summary or attachments', () => {
    const { container } = render(
      <WhatsHappenedBlock attachments={undefined} groupedAttachments={groupedAttachments} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the summary as markdown', () => {
    render(
      <WhatsHappenedBlock
        summary="A **second sign-in** replayed the cookie."
        attachments={[]}
        groupedAttachments={groupedAttachments}
      />
    );

    expect(screen.getByText('second sign-in').tagName).toBe('STRONG');
  });

  it('shows only the first paragraph of a multi-paragraph summary until expanded', () => {
    render(
      <WhatsHappenedBlock
        summary={'First paragraph.\n\nSecond paragraph.'}
        attachments={[]}
        groupedAttachments={groupedAttachments}
      />
    );

    expect(screen.getByText('First paragraph.')).toBeInTheDocument();
    expect(screen.queryByText('Second paragraph.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText('Second paragraph.')).not.toBeInTheDocument();
  });

  it('ignores leading blank lines when it picks the first paragraph', () => {
    render(
      <WhatsHappenedBlock
        summary={'\n\nFirst paragraph.\n\nSecond paragraph.'}
        attachments={[]}
        groupedAttachments={groupedAttachments}
      />
    );

    expect(screen.getByText('First paragraph.')).toBeInTheDocument();
    expect(screen.queryByText('Second paragraph.')).not.toBeInTheDocument();
  });

  it('does not offer to expand an empty summary', () => {
    render(
      <WhatsHappenedBlock
        summary=""
        attachments={[attachment]}
        groupedAttachments={groupedAttachments}
      />
    );

    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('does not offer to expand a single-paragraph summary', () => {
    render(
      <WhatsHappenedBlock
        summary={'x'.repeat(300)}
        attachments={[]}
        groupedAttachments={groupedAttachments}
      />
    );

    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });
});
