/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// POC: throw-away demo of @user / @agent mentions with fake data. Not for production.

import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  EuiAvatar,
  EuiBadge,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { ChatTriggerMode } from '../../../../../common/http_api/chat';
import { ConversationInput } from './conversation_input';
import {
  POC_SPACE_USERS,
  PocMentionScopeProvider,
} from './message_editor/command_menu/menus/mentions';
import type { PocMentionScope } from './message_editor/command_menu/menus/mentions';

const ME = 'Petr Krejcik';

interface DemoMessage {
  readonly id: number;
  readonly author: string;
  // Set for messages written by a teammate, so the story knows who is already in the chat
  readonly authorId?: string;
  readonly isAgent: boolean;
  readonly content: string;
  readonly audience: string;
}

interface DemoConversation {
  readonly id: string;
  readonly title: string;
  readonly isPublic: boolean;
  // false = private and not shared: no @ menu, no toggle
  readonly isShared: boolean;
  readonly agentName: string;
  readonly ownerId?: string;
  readonly members: readonly string[];
  readonly seedMessages: readonly DemoMessage[];
}

const userName = (userId: string) =>
  POC_SPACE_USERS.find(({ id }) => id === userId)?.name ?? userId;

const CONVERSATIONS: readonly DemoConversation[] = [
  {
    id: 'public',
    title: 'Why did checkout errors spike last night?',
    isPublic: true,
    isShared: true,
    agentName: 'Elastic AI Agent',
    ownerId: 'u_pierre_0',
    members: [],
    seedMessages: [
      {
        id: 1,
        author: userName('u_pierre_0'),
        authorId: 'u_pierre_0',
        isAgent: false,
        content: 'Checkout errors spiked around 02:14. What happened?',
        audience: 'Asked the agent',
      },
      {
        id: 2,
        author: 'Elastic AI Agent',
        isAgent: true,
        content:
          'I looked at `logs-checkout-*`. Errors went from ~40/min to ~1,900/min at 02:14, all `PaymentGatewayTimeout` from `payments-svc` v2.31.',
        audience: '',
      },
      {
        id: 3,
        author: userName('u_julian_0'),
        authorId: 'u_julian_0',
        isAgent: false,
        content: 'I saw the same timeouts in staging after the v2.31 deploy.',
        audience: 'Posted to team',
      },
    ],
  },
  {
    id: 'private',
    title: 'Failed admin logins from new countries',
    isPublic: false,
    isShared: true,
    agentName: 'Threat Hunting Agent',
    members: ['u_julian_0', 'u_pierre_0', 'u_chris_0'],
    seedMessages: [],
  },
  {
    id: 'solo',
    title: 'My own alert triage notes',
    isPublic: false,
    isShared: false,
    agentName: 'Elastic AI Agent',
    members: [],
    seedMessages: [],
  },
];

// Matches any serialized badge, e.g. [@Julian Rosado](mention://u_julian_0?kind=user)
const BADGE_PATTERN = /\[([^\]]+)\]\((\w+):\/\/[^)]*\)/g;

const MessageContent: React.FC<{ content: string }> = ({ content }) => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const match of content.matchAll(BADGE_PATTERN)) {
    const [whole, label] = match;
    const index = match.index ?? 0;
    parts.push(content.slice(lastIndex, index));
    parts.push(
      <EuiBadge key={index} color="hollow" iconType="at">
        {label.replace(/^@/, '')}
      </EuiBadge>
    );
    lastIndex = index + whole.length;
  }
  parts.push(content.slice(lastIndex));
  return <EuiText size="s">{parts}</EuiText>;
};

const fakeAgentReply = (conversation: DemoConversation) =>
  conversation.isPublic
    ? 'I looked at `logs-checkout-*`. Errors went from ~40/min to ~1,900/min at 02:14, all `PaymentGatewayTimeout` from `payments-svc` v2.31.'
    : 'I found 4 admin accounts with failed logins from new countries. 1 of them (`svc-backup`) later logged in and created an API key.';

const getWelcome = ({ isShared }: DemoConversation) =>
  isShared
    ? 'Hi! Ask me anything. Type `@` or click the @ button to mention a teammate or me.'
    : 'Hi! Ask me anything. Only you can see this chat.';

const getAccessText = ({ isPublic, isShared }: DemoConversation) => {
  if (isPublic) {
    return 'Public - everyone in the space can see it. Mention anyone. Toggle: Ask agent / Post to team.';
  }
  if (isShared) {
    return 'Private, shared - members only. Mention the agent or a member. Toggle: Ask agent / Post to team.';
  }
  return 'Private, not shared - only you. No @ mentions and no toggle.';
};

const ConversationHeader: React.FC<{ conversation: DemoConversation }> = ({ conversation }) => {
  const members = POC_SPACE_USERS.filter(({ id }) => conversation.members.includes(id));
  return (
    <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="s">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>{conversation.title}</h3>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {`Agent: ${conversation.agentName}`}
        </EuiText>
        <EuiText size="xs" color="subdued">
          {getAccessText(conversation)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiIcon type={conversation.isPublic ? 'globe' : 'lock'} size="s" aria-hidden={true} />
          {members.map(({ id, name }) => (
            <EuiAvatar key={id} name={name} size="s" />
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const MentionsDemo: React.FC = () => {
  const [activeId, setActiveId] = useState(CONVERSATIONS[0].id);
  const [messagesById, setMessagesById] = useState<Record<string, DemoMessage[]>>(() =>
    Object.fromEntries(CONVERSATIONS.map(({ id, seedMessages }) => [id, [...seedMessages]]))
  );
  const [typingId, setTypingId] = useState<string>();
  const [showRaw, setShowRaw] = useState(false);

  const conversation = CONVERSATIONS.find(({ id }) => id === activeId) ?? CONVERSATIONS[0];
  const messages = useMemo(
    () => messagesById[conversation.id] ?? [],
    [messagesById, conversation.id]
  );

  // Public: anyone in the space. Private shared: only the conversation members.
  // Participants = the owner and everyone who already wrote a message here. They come first.
  const mentionScope: PocMentionScope = useMemo(() => {
    const authorIds = messages.flatMap(({ authorId }) => (authorId ? [authorId] : []));
    const participantIds = [conversation.ownerId, ...authorIds].filter(
      (id, index, ids): id is string => id !== undefined && ids.indexOf(id) === index
    );
    return {
      agentName: conversation.agentName,
      users: conversation.isPublic
        ? POC_SPACE_USERS
        : POC_SPACE_USERS.filter(({ id }) => conversation.members.includes(id)),
      participants: participantIds,
      isShared: conversation.isShared,
    };
  }, [conversation, messages]);

  const addMessage = (conversationId: string, message: DemoMessage) =>
    setMessagesById((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), message],
    }));

  const handleSubmit = (content: string, triggerMode?: ChatTriggerMode) => {
    const current = conversation;
    const isForAgent = triggerMode !== ChatTriggerMode.Never;

    addMessage(current.id, {
      id: Date.now(),
      author: ME,
      isAgent: false,
      content,
      audience: isForAgent ? 'Asked the agent' : 'Posted to team',
    });

    if (!isForAgent) {
      return;
    }
    setTypingId(current.id);
    setTimeout(() => {
      setTypingId(undefined);
      addMessage(current.id, {
        id: Date.now(),
        author: current.agentName,
        isAgent: true,
        content: fakeAgentReply(current),
        audience: '',
      });
    }, 1200);
  };

  const allMessages: DemoMessage[] = [
    {
      id: 0,
      author: conversation.agentName,
      isAgent: true,
      content: getWelcome(conversation),
      audience: '',
    },
    ...messages,
  ];

  return (
    <EuiFlexGroup gutterSize="l" alignItems="flexStart">
      <EuiFlexItem grow={false} style={{ width: 240 }}>
        <EuiPanel hasBorder paddingSize="s">
          <EuiText size="xs" color="subdued">
            <strong>Conversations</strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiListGroup flush gutterSize="none">
            {CONVERSATIONS.map(({ id, title, isPublic, isShared }) => (
              <EuiListGroupItem
                key={id}
                size="s"
                label={title}
                iconType={isPublic ? 'globe' : isShared ? 'users' : 'lock'}
                isActive={id === activeId}
                onClick={() => setActiveId(id)}
                wrapText
              />
            ))}
          </EuiListGroup>
          <EuiSpacer size="m" />
          <EuiSwitch
            compressed
            label="Show what the agent receives"
            checked={showRaw}
            onChange={(event) => setShowRaw(event.target.checked)}
          />
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel hasBorder paddingSize="m">
          <ConversationHeader conversation={conversation} />
          <EuiSpacer size="m" />
          <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allMessages.map(({ id, author, isAgent, content, audience }) => (
              <EuiFlexGroup
                key={id}
                gutterSize="s"
                alignItems="flexStart"
                responsive={false}
                style={{ flexGrow: 0 }}
              >
                <EuiFlexItem grow={false}>
                  {isAgent ? (
                    <EuiAvatar name={author} size="m" iconType="productAgent" color="subdued" />
                  ) : (
                    <EuiAvatar name={author} size="m" />
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs">
                    <strong>{author}</strong>
                    {audience && <span style={{ opacity: 0.6 }}>{` · ${audience}`}</span>}
                  </EuiText>
                  <MessageContent content={content} />
                  {showRaw && !isAgent && (
                    <EuiCode transparentBackground={false} style={{ marginTop: 4 }}>
                      {content}
                    </EuiCode>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
            {typingId === conversation.id && (
              <EuiText size="xs" color="subdued">
                {`${conversation.agentName} is thinking...`}
              </EuiText>
            )}
          </div>
          <EuiSpacer size="m" />
          <PocMentionScopeProvider value={mentionScope}>
            {/* key: each conversation gets a fresh input */}
            <ConversationInput key={conversation.id} onSubmitOverride={handleSubmit} />
          </PocMentionScopeProvider>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const meta: Meta<typeof MentionsDemo> = {
  title: 'Conversations/Input/Mentions POC',
  component: MentionsDemo,
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider>
        <div style={{ maxWidth: 1400, padding: 16 }}>
          <Story />
        </div>
      </AgentBuilderStorybookProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof MentionsDemo>;

export const Demo: Story = {};
