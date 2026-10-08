/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
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

// The pill styles read the theme from Emotion context, so renders need a provider.
const render = (ui: React.ReactElement) => rtlRender(<EuiThemeProvider>{ui}</EuiThemeProvider>);

const mockGetAttachmentUiDefinition = jest.fn();
jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    attachmentsService: { getAttachmentUiDefinition: mockGetAttachmentUiDefinition },
  }),
}));

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
  beforeEach(() => {
    mockGetAttachmentUiDefinition.mockReset();
    mockGetAttachmentUiDefinition.mockReturnValue(undefined);
  });

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

  it('renders the "Added" heading and one pill per resolved attachment', () => {
    render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('a'), makeRef('b')]}
        conversationAttachments={[makeVersioned('a', 'First'), makeVersioned('b', 'Second')]}
      />
    );

    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getAllByTestId('agentBuilderRoundAttachmentReferencePill')).toHaveLength(2);
  });

  it('uses the UI definition getLabel for the pill title when available', () => {
    mockGetAttachmentUiDefinition.mockReturnValue({
      getLabel: () => 'Registry Label',
      getIcon: () => 'code',
    });

    render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('a')]}
        conversationAttachments={[makeVersioned('a', 'Description Label')]}
      />
    );

    expect(screen.getByText('Registry Label')).toBeInTheDocument();
    expect(screen.queryByText('Description Label')).not.toBeInTheDocument();
  });

  it('falls back to the description, then the type, when there is no UI definition', () => {
    render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('a'), makeRef('b')]}
        conversationAttachments={[makeVersioned('a', 'Description Label'), makeVersioned('b')]}
      />
    );

    expect(screen.getByText('Description Label')).toBeInTheDocument();
    expect(screen.getByText('text')).toBeInTheDocument();
  });

  it('renders the UI definition icon, defaulting to document when absent', () => {
    mockGetAttachmentUiDefinition
      .mockReturnValueOnce({ getLabel: () => 'With Icon', getIcon: () => 'code' })
      .mockReturnValueOnce(undefined);

    const { container } = render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('a'), makeRef('b')]}
        conversationAttachments={[makeVersioned('a'), makeVersioned('b', 'No Definition')]}
      />
    );

    expect(container.querySelector('[data-euiicon-type="code"]')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="document"]')).toBeInTheDocument();
  });

  it('falls back to description, then type, when the referenced version cannot be resolved', () => {
    mockGetAttachmentUiDefinition.mockReturnValue({
      getLabel: () => 'Registry Label',
      getIcon: () => 'code',
    });

    render(
      <RoundAttachmentReferences
        attachmentRefs={[
          { attachment_id: 'a', version: 2, actor: ATTACHMENT_REF_ACTOR.user },
          { attachment_id: 'b', version: 2, actor: ATTACHMENT_REF_ACTOR.user },
        ]}
        conversationAttachments={[makeVersioned('a', 'Description Label'), makeVersioned('b')]}
      />
    );

    // With description: uses description (skips getLabel since version is wrong)
    expect(screen.getByText('Description Label')).toBeInTheDocument();
    // Without description: falls back to type
    expect(screen.getByText('text')).toBeInTheDocument();
    // getLabel is never used when the version can't be resolved
    expect(screen.queryByText('Registry Label')).not.toBeInTheDocument();
  });

  it('keeps the full title in the DOM (truncation is CSS-only)', () => {
    const longTitle = 'A very long attachment title that definitely exceeds the pill width';
    render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('a')]}
        conversationAttachments={[makeVersioned('a', longTitle)]}
      />
    );

    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it('deduplicates by group_id — renders only one pill for a group', () => {
    render(
      <RoundAttachmentReferences
        attachmentRefs={[makeRef('a1'), makeRef('a2')]}
        conversationAttachments={[
          makeVersioned('a1', '27 Alerts', 'group-1'),
          makeVersioned('a2', '27 Alerts', 'group-1'),
        ]}
      />
    );

    const pills = screen.getAllByText(/27 Alerts/);
    expect(pills).toHaveLength(1);
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

    const pills = screen.getAllByText(/27 Alerts/);
    expect(pills).toHaveLength(1);
  });
});
