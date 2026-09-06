/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { AttachmentConverter } from './auto_attach';

export interface AddItemsToChatOptions {
  addAttachment?: AgentBuilderPluginStart['addAttachment'];
  activeConversation$?: Observable<ActiveConversation | null>;
}

const isChatBound = (
  activeConversation$: Observable<ActiveConversation | null> | undefined
): boolean => {
  if (!activeConversation$) {
    return false;
  }

  let bound = false;
  const subscription = activeConversation$.subscribe((conversation) => {
    bound = conversation !== null;
  });
  subscription.unsubscribe();
  return bound;
};

export const addItemsToChat = <AttachableItem>(
  openChat: AgentBuilderPluginStart['openChat'] | undefined,
  items: AttachableItem[],
  converter: AttachmentConverter<AttachableItem>,
  { addAttachment, activeConversation$ }: AddItemsToChatOptions = {}
): void => {
  if (items.length === 0) {
    return;
  }

  const attachments = items.map((item) => converter.toAttachment(item));

  if (addAttachment && isChatBound(activeConversation$)) {
    for (const attachment of attachments) {
      addAttachment(attachment);
    }
    return;
  }

  if (!openChat) {
    return;
  }

  openChat({
    autoSendInitialMessage: false,
    newConversation: true,
    attachments,
  });
};
