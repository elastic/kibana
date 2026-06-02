/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationChatMode,
  TemplateSnapshot,
  UserIdAndName,
} from '@kbn/agent-builder-common';
import type { ConversationCreateRequest } from './types';
import type { ConversationProperties } from './storage';

/**
 * POC conversation templates — replaced by B2 template registry.
 * @see docs/agent_builder_option_b_access_model.md
 */
const POC_CONVERSATION_TEMPLATES: Record<
  string,
  Omit<TemplateSnapshot, 'template_id' | 'captured_at'>
> = {
  'incident-triage-v2': {
    profile: 'incident',
    chat_mode: 'collaborative',
    write_privileges: ['write_incident_investigation'],
  },
  'research-notes-v1': {
    profile: 'research',
    chat_mode: 'single',
    write_privileges: [],
  },
};

export const resolveTemplateSnapshotOnCreate = ({
  conversation,
  creationDate,
}: {
  conversation: Pick<ConversationCreateRequest, 'template_id' | 'template_snapshot'>;
  creationDate: Date;
}): TemplateSnapshot | undefined => {
  if (conversation.template_snapshot) {
    return conversation.template_snapshot;
  }

  const { template_id: templateId } = conversation;
  if (!templateId) {
    return undefined;
  }

  const pocDefaults = POC_CONVERSATION_TEMPLATES[templateId];
  if (!pocDefaults) {
    return undefined;
  }

  return {
    template_id: templateId,
    captured_at: creationDate.toISOString(),
    ...pocDefaults,
  };
};

/** Denormalized chat_mode on ES, with legacy conversation_mode fallback. */
export const resolveChatMode = (
  source: Pick<ConversationProperties, 'chat_mode' | 'conversation_mode' | 'template_snapshot'>
): ConversationChatMode | undefined => {
  if (source.chat_mode) {
    return source.chat_mode;
  }
  if (source.template_snapshot?.chat_mode) {
    return source.template_snapshot.chat_mode;
  }
  if (source.conversation_mode === 'group') {
    return 'collaborative';
  }
  return undefined;
};

/** Collaborative investigation ⇒ team-visible in the Kibana space. */
export const isCollaborativeConversation = (
  conversation: Pick<
    ConversationProperties,
    'chat_mode' | 'conversation_mode' | 'template_snapshot'
  >
): boolean => {
  return resolveChatMode(conversation) === 'collaborative';
};

export const isConversationOwner = ({
  source,
  user,
}: {
  source: Pick<ConversationProperties, 'user_id' | 'user_name'>;
  user: UserIdAndName;
}): boolean => {
  if (user.id && source.user_id === user.id) {
    return true;
  }
  return source.user_name === user.username;
};

/** List / get — owner-only personal chats, or any user in space for collaborative investigations. */
export const hasReadAccess = ({
  source,
  user,
}: {
  source: ConversationProperties;
  user: UserIdAndName;
}): boolean => {
  if (isCollaborativeConversation(source)) {
    return true;
  }
  return isConversationOwner({ source, user });
};

/** POC: same as read until B2.1 wires template write_privileges via authzResult. */
export const hasWriteAccess = hasReadAccess;

/** Delete — creator only for POC (even collaborative investigations). */
export const canDeleteConversation = ({
  source,
  user,
}: {
  source: ConversationProperties;
  user: UserIdAndName;
}): boolean => {
  return isConversationOwner({ source, user });
};
