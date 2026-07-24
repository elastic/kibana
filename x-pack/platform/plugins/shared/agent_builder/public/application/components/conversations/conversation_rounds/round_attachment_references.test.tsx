/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type {
  VersionedAttachment,
  Attachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import {
  ATTACHMENT_REF_ACTOR,
  ATTACHMENT_REF_OPERATION,
} from '@kbn/agent-builder-common/attachments';
import { RoundAttachmentReferences } from './round_attachment_references';

const makeVersioned = (
  id: string,
  description?: string,
  group_id?: string
): VersionedAttachment => ({
  id,
  type: 'text',
  versions: [{ version: 1, data: {}, created_at: '2024-01-01T00:00:00Z', content_hash: 'x' }],
  current_version: 1,
  active: true,
  ...(description !== undefined ? { description } : {}),
  ...(group_id !== undefined ? { group_id } : {}),
});

const makeRef = (
  id: string,
  actor: (typeof ATTACHMENT_REF_ACTOR)[keyof typeof ATTACHMENT_REF_ACTOR] = ATTACHMENT_REF_ACTOR.user,
  operation?: (typeof ATTACHMENT_REF_OPERATION)[keyof typeof ATTACHMENT_REF_OPERATION]
): AttachmentVersionRef => ({
  attachment_id: id,
  version: 1,
  actor,
  operation,
});

const makeFallback = (id: string, description?: string, groupId?: string): Attachment => ({
  id,
  type: 'text',
  data: {},
  ...(description !== undefined ? { description } : {}),
  ...(groupId !== undefined ? { groupId } : {}),
});

describe('RoundAttachmentReferences', () => {
  it('renders nothing when there are no refs or attachments', () => {
    const { container } = render(<RoundAttachmentReferences />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when refs are empty', () => {
    const { container } = render(
      <RoundAttachmentReferences
        attachmentRefs={[]}
        conversationAttachments={[makeVersioned('a', 'Label A')]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders one line per resolved attachment', () => {
    render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('a'), makeRef('b')]}
        conversationAttachments={[makeVersioned('a', 'First'), makeVersioned('b', 'Second')]}
      />
    );

    expect(screen.getByText(/First/)).toBeInTheDocument();
    expect(screen.getByText(/Second/)).toBeInTheDocument();
  });

  it('deduplicates by group_id — renders only one line for a group', () => {
    render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('a1'), makeRef('a2')]}
        conversationAttachments={[
          makeVersioned('a1', '27 Alerts', 'group-1'),
          makeVersioned('a2', '27 Alerts', 'group-1'),
        ]}
      />
    );

    const lines = screen.getAllByText(/27 Alerts/);
    expect(lines).toHaveLength(1);
  });

  it('actor filter applied before group dedup — matching actor ref renders even when preceded by non-matching actor ref for the same group', () => {
    // Regression for: system ref consumed group slot before actor filter, so user ref was never rendered.
    render(
      <RoundAttachmentReferences
        attachmentRefs={[
          makeRef('a1', ATTACHMENT_REF_ACTOR.system), // non-matching — must NOT consume slot
          makeRef('a2', ATTACHMENT_REF_ACTOR.user), // matching — must render
        ]}
        conversationAttachments={[
          makeVersioned('a1', '27 Alerts', 'group-1'),
          makeVersioned('a2', '27 Alerts', 'group-1'),
        ]}
        actorFilter={[ATTACHMENT_REF_ACTOR.user]}
      />
    );

    expect(screen.getByText(/27 Alerts/)).toBeInTheDocument();
  });

  it('renders nothing when all refs are filtered out by actorFilter', () => {
    const { container } = render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('a', ATTACHMENT_REF_ACTOR.system)]}
        conversationAttachments={[makeVersioned('a', 'Label')]}
        actorFilter={[ATTACHMENT_REF_ACTOR.user]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('skips hidden attachments', () => {
    const hidden: VersionedAttachment = { ...makeVersioned('h', 'Hidden Label'), hidden: true };
    const { container } = render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('h')]}
        conversationAttachments={[hidden]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('skips refs with operation=read', () => {
    const { container } = render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('a', ATTACHMENT_REF_ACTOR.user, ATTACHMENT_REF_OPERATION.read)]}
        conversationAttachments={[makeVersioned('a', 'Label')]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('uses fallbackAttachments when no attachmentRefs are provided', () => {
    render(
      <RoundAttachmentReferences fallbackAttachments={[makeFallback('f1', 'Fallback Label')]} />
    );
    expect(screen.getByText(/Fallback Label/)).toBeInTheDocument();
  });

  it('deduplicates fallback attachments by group_id', () => {
    render(
      <RoundAttachmentReferences
        fallbackAttachments={[
          makeFallback('f1', '27 Alerts', 'group-1'),
          makeFallback('f2', '27 Alerts', 'group-1'),
        ]}
      />
    );

    const lines = screen.getAllByText(/27 Alerts/);
    expect(lines).toHaveLength(1);
  });
});
