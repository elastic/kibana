/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import type { Conversation } from '@kbn/agent-builder-common';
import { ConversationJournal } from './conversation_journal';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../hooks/use_conversation';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

jest.mock('../../../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation', () => ({
  useConversation: jest.fn(),
}));

jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: jest.fn(),
}));

jest.mock(
  '../conversation_rounds/round_response/attachments/inline_attachment_with_actions',
  () => ({
    InlineAttachmentWithActions: ({
      attachment,
    }: {
      attachment: {
        data?: { summary_markdown?: string; verdict?: string };
        id: string;
        type: string;
      };
    }) => (
      <div data-test-subj={`inline-${attachment.id}`}>
        {attachment.type}
        {attachment.data?.verdict != null ? `:${attachment.data.verdict}` : ''}
        {attachment.data?.summary_markdown != null ? `:${attachment.data.summary_markdown}` : ''}
      </div>
    ),
  })
);

const useConversationMock = jest.mocked(useConversation);
const useConversationIdMock = jest.mocked(useConversationId);
const useAgentBuilderServicesMock = jest.mocked(useAgentBuilderServices);

const systemActor = {
  id: 'system-alertzero-journal-note',
  type: EventActorType.system,
};

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  agent_id: 'elastic-ai-agent',
  attachments: [
    {
      current_version: 1,
      id: 'attack-discovery',
      type: 'security.attack_discovery',
      versions: [
        {
          content_hash: 'h1',
          created_at: '2026-09-18T00:02:00.000Z',
          data: { title: 'macOS Keychain Theft' },
          version: 1,
        },
      ],
    },
  ],
  created_at: '2026-09-18T00:00:00.000Z',
  events: [
    {
      actor: systemActor,
      created_at: '2026-09-18T00:01:00.000Z',
      data: { message: 'Review started' },
      id: 'evt-journal-1',
      type: TimelineEventType.userMessage,
    },
    {
      actor: systemActor,
      created_at: '2026-09-18T00:01:30.000Z',
      data: { message: 'A real round' },
      execution_id: 'round-1',
      id: 'evt-round-user',
      type: TimelineEventType.userMessage,
    },
    {
      actor: systemActor,
      created_at: '2026-09-18T00:02:00.000Z',
      data: {
        attachment_id: 'attack-discovery',
        attachment_type: 'security.attack_discovery',
        current_version: 1,
        render_inline: true,
        source: 'execution',
      },
      id: 'evt-attach-1',
      type: TimelineEventType.attachmentAdded,
    },
  ],
  id: 'conversation-1',
  rounds: [],
  title: 'macOS Keychain Theft',
  updated_at: '2026-09-18T00:10:00.000Z',
  user: { id: 'u1', username: 'elastic' },
  ...overrides,
});

describe('ConversationJournal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useConversationIdMock.mockReturnValue('conversation-1');
    useAgentBuilderServicesMock.mockReturnValue({
      attachmentsService: {},
    } as ReturnType<typeof useAgentBuilderServices>);
  });

  it('renders journal notes that have no execution_id', () => {
    useConversationMock.mockReturnValue({
      conversation: makeConversation(),
    } as ReturnType<typeof useConversation>);

    render(<ConversationJournal />);

    expect(screen.getByText('Review started')).toBeInTheDocument();
    expect(screen.queryByText('A real round')).not.toBeInTheDocument();
  });

  it('renders attachment_added events through the inline attachment renderer', () => {
    useConversationMock.mockReturnValue({
      conversation: makeConversation(),
    } as ReturnType<typeof useConversation>);

    render(<ConversationJournal />);

    expect(screen.getByTestId('inline-attack-discovery')).toBeInTheDocument();
  });

  it('renders conversation attachments when there are no attachment_added events', () => {
    useConversationMock.mockReturnValue({
      conversation: makeConversation({ events: [] }),
    } as ReturnType<typeof useConversation>);

    render(<ConversationJournal />);

    expect(screen.getByTestId('inline-attack-discovery')).toBeInTheDocument();
  });

  it('renders leftover analysis-verdict text attachments through the verdict renderer', () => {
    useAgentBuilderServicesMock.mockReturnValue({
      attachmentsService: {
        getAttachmentUiDefinition: (type: string) =>
          type === 'security.attack_discovery.verdict' ? {} : undefined,
      },
    } as ReturnType<typeof useAgentBuilderServices>);
    useConversationMock.mockReturnValue({
      conversation: makeConversation({
        attachments: [
          {
            current_version: 1,
            id: 'analysis-verdict',
            type: 'text',
            versions: [
              {
                content_hash: 'h-verdict',
                created_at: '2026-09-18T00:03:00.000Z',
                data: {
                  content:
                    '# Analysis verdict: inconclusive\n\nOneNote from {{ source.ip 77.75.230.128 }}.',
                },
                version: 1,
              },
            ],
          },
        ],
        events: [],
      }),
    } as ReturnType<typeof useConversation>);

    render(<ConversationJournal />);

    expect(screen.getByTestId('inline-analysis-verdict')).toHaveTextContent(
      'security.attack_discovery.verdict:inconclusive:OneNote from {{ source.ip 77.75.230.128 }}.'
    );
  });

  it('leaves leftover text attachments unchanged when they are not analysis verdicts', () => {
    useConversationMock.mockReturnValue({
      conversation: makeConversation({
        attachments: [
          {
            current_version: 1,
            id: 'notes',
            type: 'text',
            versions: [
              {
                content_hash: 'h-notes',
                created_at: '2026-09-18T00:03:00.000Z',
                data: { content: 'Just a note' },
                version: 1,
              },
            ],
          },
        ],
        events: [],
      }),
    } as ReturnType<typeof useConversation>);

    render(<ConversationJournal />);

    expect(screen.getByTestId('inline-notes')).toHaveTextContent('text');
  });

  it('renders nothing when the conversation has no events and no attachments', () => {
    useConversationMock.mockReturnValue({
      conversation: makeConversation({ attachments: [], events: [] }),
    } as ReturnType<typeof useConversation>);

    const { container } = render(<ConversationJournal />);

    expect(container).toBeEmptyDOMElement();
  });
});
