/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import type { ConversationAccessControl } from '@kbn/agent-builder-common';
import type { GetConversationResponse } from '../../../../../common/http_api/conversations';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import {
  createStorybookAgentBuilderServices,
  storyAgent,
} from '../../../__storybook__/agent_builder_services';
import {
  STORYBOOK_CURRENT_USER_ID,
  STORYBOOK_TEAMMATES,
  createStorybookKibanaServices,
} from '../../../__storybook__/kibana_services';
import { ConversationInput } from './conversation_input';

const CONVERSATION_TITLE = 'Q3 revenue review';

const defaultAgentService = createStorybookAgentBuilderServices().agentService;
const defaultUserProfile = createStorybookKibanaServices().userProfile;

const createConversation = (
  id: string,
  accessControl: ConversationAccessControl
): GetConversationResponse => ({
  id,
  agent_id: storyAgent.id,
  user: { id: STORYBOOK_CURRENT_USER_ID, username: STORYBOOK_CURRENT_USER_ID },
  title: CONVERSATION_TITLE,
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  rounds: [],
  access_control: accessControl,
  permissions: { rename: true, delete: true, update_access_control: true },
});

const createMember = (id: string) => ({
  type: 'user' as const,
  id,
  role: ConversationAccessControlRole.Member,
  added_at: '2026-10-01T10:00:00.000Z',
});

const publicAccess: ConversationAccessControl = {
  access_mode: ConversationAccessControlMode.Public,
  entries: [],
};

interface MentionsStoryOptions {
  conversationId: string;
  accessControl: ConversationAccessControl;
  // When false, the user suggestions return nobody
  hasSpaceTeammates?: boolean;
}

const withConversation = ({
  conversationId,
  accessControl,
  hasSpaceTeammates = true,
}: MentionsStoryOptions): Story['decorators'] => {
  const conversation = createConversation(conversationId, accessControl);
  return [
    (Story) => (
      <AgentBuilderStorybookProvider
        conversationId={conversation.id}
        services={{
          conversationsService: { get: () => Promise.resolve(conversation) } as never,
          agentService: { ...defaultAgentService, get: () => Promise.resolve(storyAgent) },
        }}
        kibanaServices={
          hasSpaceTeammates
            ? undefined
            : { userProfile: { ...defaultUserProfile, suggest: () => Promise.resolve([]) } }
        }
      >
        <div style={{ maxWidth: 640, padding: 16, paddingTop: 320 }}>
          <Story />
        </div>
      </AgentBuilderStorybookProvider>
    ),
  ];
};

// `@` opens a menu only after the conversation loads (its title is in the editor label).
// `userEvent.type` skips `contenteditable="plaintext-only"`, so insert text like the browser does.
const openMentionsMenu = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  const editor = await within(canvasElement).findByLabelText(
    `${CONVERSATION_TITLE} conversation, Message input`
  );
  await userEvent.click(editor);
  document.execCommand('insertText', false, '@');
};

const meta: Meta<typeof ConversationInput> = {
  title: 'Conversations/Input/User Mentions',
  component: ConversationInput,
  args: {
    onSubmitOverride: fn(),
  },
  beforeEach: () => {
    // Remove drafts from earlier visits, else they fill the input before the play types
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('agent-builder:draft:'))
      .forEach((key) => sessionStorage.removeItem(key));
  },
  play: openMentionsMenu,
};
export default meta;

type Story = StoryObj<typeof ConversationInput>;

export const PublicTenPeople: Story = {
  name: 'Public conversation - 10 people',
  decorators: withConversation({
    conversationId: 'story-mentions-public-10',
    accessControl: publicAccess,
  }),
};

export const PublicNoPeople: Story = {
  name: 'Public conversation - 0 people',
  decorators: withConversation({
    conversationId: 'story-mentions-public-0',
    accessControl: publicAccess,
    hasSpaceTeammates: false,
  }),
};

export const PrivateTenPeople: Story = {
  name: 'Private conversation - shared with 10 people',
  decorators: withConversation({
    conversationId: 'story-mentions-private-10',
    accessControl: {
      access_mode: ConversationAccessControlMode.Private,
      entries: STORYBOOK_TEAMMATES.map(({ uid }) => createMember(uid)),
    },
  }),
};

export const PrivateNoPeople: Story = {
  name: 'Private conversation - not shared',
  decorators: withConversation({
    conversationId: 'story-mentions-private-0',
    accessControl: { access_mode: ConversationAccessControlMode.Private, entries: [] },
  }),
};
