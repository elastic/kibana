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
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiNotificationBadge,
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
  parsePocMentions,
} from './message_editor/command_menu/menus/mentions';
import type { PocMentionScope } from './message_editor/command_menu/menus/mentions';

const ME = 'Petr Krejcik';

interface DemoConversation {
  readonly id: string;
  readonly title: string;
  readonly isPublic: boolean;
  readonly agentName: string;
  readonly members: readonly string[];
}

const CONVERSATIONS: readonly DemoConversation[] = [
  {
    id: 'public',
    title: 'Why did checkout errors spike last night?',
    isPublic: true,
    agentName: 'Elastic AI Agent',
    members: [],
  },
  {
    id: 'private',
    title: 'Failed admin logins from new countries',
    isPublic: false,
    agentName: 'Threat Hunting Agent',
    members: ['u_julian_0', 'u_pierre_0', 'u_chris_0'],
  },
];

interface DemoMessage {
  readonly id: number;
  readonly author: string;
  readonly isAgent: boolean;
  readonly content: string;
  readonly audience: string;
}

interface DemoNotification {
  readonly id: number;
  readonly user: string;
  readonly conversationTitle: string;
  readonly preview: string;
}

// Matches any serialized badge, e.g. [@Julian Rosado](mention://u_julian_0?kind=user)
const BADGE_PATTERN = /\[([^\]]+)\]\((\w+):\/\/[^)]*\)/g;

const toPlainText = (content: string) => content.replace(BADGE_PATTERN, '$1');

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

const fakeAgentReply = (conversation: DemoConversation, content: string) => {
  const mentionedUsers = parsePocMentions(content).filter(({ kind }) => kind === 'user');
  const base = conversation.isPublic
    ? 'I looked at `logs-checkout-*`. Errors went from ~40/min to ~1,900/min at 02:14, all `PaymentGatewayTimeout` from `payments-svc` v2.31.'
    : 'I found 4 admin accounts with failed logins from new countries. 1 of them (`svc-backup`) later logged in and created an API key.';
  if (mentionedUsers.length === 0) {
    return base;
  }
  return `${base} I let ${mentionedUsers.map(({ name }) => name).join(' and ')} know.`;
};

const WELCOME = 'Hi! Ask me anything. Type `@` or click the @ button to mention a teammate or me.';

const ConversationHeader: React.FC<{ conversation: DemoConversation }> = ({ conversation }) => {
  const members = POC_SPACE_USERS.filter(({ id }) => conversation.members.includes(id));
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{conversation.title}</h3>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {`Agent: ${conversation.agentName}`}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiIcon type={conversation.isPublic ? 'globe' : 'lock'} size="s" aria-hidden={true} />
          <EuiText size="xs" color="subdued">
            {conversation.isPublic ? 'Public - everyone in the space' : 'Private - members only'}
          </EuiText>
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
  const [messagesById, setMessagesById] = useState<Record<string, DemoMessage[]>>({});
  const [notifications, setNotifications] = useState<DemoNotification[]>([]);
  const [typingId, setTypingId] = useState<string>();
  const [showRaw, setShowRaw] = useState(false);

  const conversation = CONVERSATIONS.find(({ id }) => id === activeId) ?? CONVERSATIONS[0];
  const messages = messagesById[conversation.id] ?? [];

  // Public: anyone in the space. Private: only the conversation members.
  const mentionScope: PocMentionScope = useMemo(
    () => ({
      agentName: conversation.agentName,
      users: conversation.isPublic
        ? POC_SPACE_USERS
        : POC_SPACE_USERS.filter(({ id }) => conversation.members.includes(id)),
    }),
    [conversation]
  );

  const addMessage = (conversationId: string, message: DemoMessage) =>
    setMessagesById((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), message],
    }));

  const handleSubmit = (content: string, triggerMode?: ChatTriggerMode) => {
    const current = conversation;
    const isForAgent = triggerMode !== ChatTriggerMode.Never;
    const mentionedUsers = parsePocMentions(content)
      .filter(({ kind }) => kind === 'user')
      .map(({ name }) => name);
    const uniqueUsers = mentionedUsers.filter(
      (name, index) => mentionedUsers.indexOf(name) === index
    );

    addMessage(current.id, {
      id: Date.now(),
      author: ME,
      isAgent: false,
      content,
      audience: isForAgent ? 'Asked the agent' : 'Posted to team',
    });

    if (uniqueUsers.length > 0) {
      setNotifications((prev) => [
        ...uniqueUsers.map((user, index) => ({
          id: Date.now() + index,
          user,
          conversationTitle: current.title,
          preview: toPlainText(content),
        })),
        ...prev,
      ]);
    }

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
        content: fakeAgentReply(current, content),
        audience: '',
      });
    }, 1200);
  };

  const allMessages: DemoMessage[] = [
    { id: 0, author: conversation.agentName, isAgent: true, content: WELCOME, audience: '' },
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
            {CONVERSATIONS.map(({ id, title, isPublic }) => (
              <EuiListGroupItem
                key={id}
                size="s"
                label={title}
                iconType={isPublic ? 'globe' : 'lock'}
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

      <EuiFlexItem grow={2}>
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

      <EuiFlexItem grow={1}>
        <EuiPanel hasBorder paddingSize="m">
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiTitle size="xxs">
              <h4>Notification center (fake)</h4>
            </EuiTitle>
            {notifications.length > 0 && (
              <EuiNotificationBadge>{notifications.length}</EuiNotificationBadge>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          {notifications.length === 0 ? (
            <EuiEmptyPrompt
              iconType="bell"
              titleSize="xxs"
              title={<h5>No notifications yet</h5>}
              body={<EuiText size="xs">Mention a teammate to notify them.</EuiText>}
            />
          ) : (
            notifications.map(({ id, user, conversationTitle, preview }) => (
              <EuiPanel key={id} color="subdued" paddingSize="s" style={{ marginBottom: 8 }}>
                <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiAvatar name={user} size="s" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <strong>{`To ${user}: `}</strong>
                      {`${ME} mentioned you in "${conversationTitle}"`}
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {preview}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            ))
          )}
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
