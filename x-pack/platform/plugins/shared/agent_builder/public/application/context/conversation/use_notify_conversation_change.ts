/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ConversationChangeHandler } from '../../../embeddable/types';
import type { ConversationsService } from '../../../services';

export const useNotifyConversationChange = ({
  conversationId,
  conversationsService,
  onConversationChange,
}: {
  conversationId?: string;
  conversationsService: Pick<ConversationsService, 'get'>;
  onConversationChange?: ConversationChangeHandler;
}) => {
  useEffect(() => {
    let isActive = true;

    if (!onConversationChange) {
      return;
    }

    if (!conversationId) {
      onConversationChange({ id: undefined });
      return;
    }

    conversationsService
      .get({ conversationId })
      .then((conversation) => {
        if (!isActive) {
          return;
        }

        onConversationChange({ id: conversationId, attachments: conversation.attachments });
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        onConversationChange({ id: conversationId });
      });

    return () => {
      isActive = false;
    };
  }, [conversationId, conversationsService, onConversationChange]);
};
