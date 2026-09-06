/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { PluginStart } from '@kbn/core-di';
import { useService } from '@kbn/core-di-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { AttachmentConverter } from './auto_attach';
import { addItemsToChat } from './add_items_to_chat';
import {
  shouldRestageOnConversationChange,
  toConversationBinding,
  type ConversationBinding,
} from './conversation_binding';

export interface UseManualAddToChatResult {
  addToChat: () => void;
  isAddToChatAvailable: boolean;
}

export const useManualAddToChat = <FocusedItem>(
  item: FocusedItem | undefined,
  converter: AttachmentConverter<FocusedItem>
): UseManualAddToChatResult => {
  const agentBuilder = useService(PluginStart('agentBuilder'), { optional: true }) as
    | AgentBuilderPluginStart
    | undefined;

  const converterRef = useRef(converter);
  converterRef.current = converter;

  const pendingAttachmentsRef = useRef<AttachmentInput[]>([]);

  useEffect(() => {
    const activeConversation$ = agentBuilder?.events?.ui.activeConversation$;
    if (!agentBuilder?.addAttachment || !activeConversation$) {
      return;
    }

    let previous: ConversationBinding = { kind: 'unbound' };
    let pendingAddTimeout: ReturnType<typeof setTimeout> | undefined;

    const subscription = activeConversation$.subscribe((conversation) => {
      const next = toConversationBinding(conversation);
      const attachments = pendingAttachmentsRef.current;
      const shouldRestage =
        attachments.length > 0 && shouldRestageOnConversationChange(previous, next);

      previous = next;

      if (!shouldRestage) {
        return;
      }

      if (pendingAddTimeout !== undefined) {
        clearTimeout(pendingAddTimeout);
      }

      pendingAddTimeout = setTimeout(() => {
        pendingAddTimeout = undefined;
        for (const attachment of attachments) {
          agentBuilder.addAttachment(attachment);
        }
      });
    });

    return () => {
      subscription.unsubscribe();
      if (pendingAddTimeout !== undefined) {
        clearTimeout(pendingAddTimeout);
      }
    };
  }, [agentBuilder]);

  const isAddToChatAvailable = Boolean(agentBuilder?.openChat && item);

  const addToChat = useCallback(() => {
    if (!item) {
      return;
    }

    pendingAttachmentsRef.current = [converterRef.current.toAttachment(item)];

    addItemsToChat(agentBuilder?.openChat, [item], converterRef.current, {
      addAttachment: agentBuilder?.addAttachment,
      activeConversation$: agentBuilder?.events?.ui.activeConversation$,
    });
  }, [agentBuilder, item]);

  return { addToChat, isAddToChatAvailable };
};
