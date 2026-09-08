/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { AttachmentConverter } from '../../types';
import { addItemsToChat } from './add_items_to_chat';
import {
  shouldRestageOnConversationChange,
  toConversationBinding,
  type ConversationBinding,
} from './conversation_binding';

export interface ManualAddToChatServices {
  agentBuilder?: AgentBuilderPluginStart;
  application?: ApplicationStart;
}

export interface UseManualAddToChatResult {
  addToChat: () => void;
  isAddToChatAvailable: boolean;
}

/** True when the agent builder plugin is present and the user can open chat. */
export const canManuallyAddToChat = (item: unknown, services: ManualAddToChatServices): boolean =>
  Boolean(
    item &&
      services.agentBuilder?.openChat &&
      services.application?.capabilities.agentBuilder?.show === true
  );

export const useManualAddToChat = <FocusedItem>(
  item: FocusedItem | undefined,
  converter: AttachmentConverter<FocusedItem>,
  services: ManualAddToChatServices
): UseManualAddToChatResult => {
  const { agentBuilder } = services;

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

  const isAddToChatAvailable = canManuallyAddToChat(item, services);

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
