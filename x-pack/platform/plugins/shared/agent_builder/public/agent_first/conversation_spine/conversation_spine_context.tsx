/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useConversationId } from '../../application/context/conversation/use_conversation_id';
import { formatSpineDisplayLabel } from './hooks/use_spine_display_label';
import { formatSpineIdentifier } from './hooks/use_spine_identifier';
import type {
  ConversationSpineRecord,
  ConversationSpineState,
  OpenSpineOptions,
  SpineTabId,
} from './types';

interface ConversationSpineContextValue {
  spineState: ConversationSpineState | null;
  isSpineActive: boolean;
  spineDisplayLabel: string | null;
  openSpine: (options?: OpenSpineOptions) => void;
  closeSpine: () => void;
  setActiveTab: (tabId: SpineTabId) => void;
  openAttachmentPreview: (attachment: UnknownAttachment) => void;
  closeAttachmentPreview: () => void;
  setSpineAttachmentOrigin: (origin: string) => void;
}

const ConversationSpineContext = createContext<ConversationSpineContextValue | null>(null);

const buildSpineRecord = (conversationId: string): ConversationSpineRecord => ({
  type: 'chat',
  identifier: formatSpineIdentifier(conversationId),
  conversationId,
});

interface ConversationSpineProviderProps {
  children: React.ReactNode;
}

export const ConversationSpineProvider: React.FC<ConversationSpineProviderProps> = ({ children }) => {
  const conversationId = useConversationId();
  const [spineState, setSpineState] = useState<ConversationSpineState | null>(null);
  const prevConversationIdRef = useRef(conversationId);

  const closeSpine = useCallback(() => {
    setSpineState(null);
  }, []);

  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      closeSpine();
      prevConversationIdRef.current = conversationId;
    }
  }, [conversationId, closeSpine]);

  const openSpine = useCallback(
    (options?: OpenSpineOptions) => {
      if (!conversationId) {
        return;
      }

      const isSidebar = options?.isSidebar ?? false;
      const record = buildSpineRecord(conversationId);

      setSpineState({
        record,
        activeTabId: options?.tabId ?? 'attachments',
        attachmentsView: options?.attachmentsView ?? { mode: 'grid' },
        isSidebar,
      });
    },
    [conversationId]
  );

  const setActiveTab = useCallback((tabId: SpineTabId) => {
    setSpineState((prev) => (prev ? { ...prev, activeTabId: tabId } : prev));
  }, []);

  const openAttachmentPreview = useCallback(
    (attachment: UnknownAttachment) => {
      openSpine({
        tabId: 'attachments',
        attachmentsView: { mode: 'attachment', attachment },
        isSidebar: false,
      });
    },
    [openSpine]
  );

  const closeAttachmentPreview = useCallback(() => {
    setSpineState((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        attachmentsView: { mode: 'grid' },
      };
    });
  }, []);

  const setSpineAttachmentOrigin = useCallback((origin: string) => {
    setSpineState((prev) => {
      if (!prev || prev.attachmentsView.mode !== 'attachment') {
        return prev;
      }
      return {
        ...prev,
        attachmentsView: {
          mode: 'attachment',
          attachment: { ...prev.attachmentsView.attachment, origin },
        },
      };
    });
  }, []);

  const spineDisplayLabel = useMemo(() => {
    if (!spineState) {
      return null;
    }
    return formatSpineDisplayLabel(spineState.record.type, spineState.record.identifier);
  }, [spineState]);

  const value = useMemo(
    () => ({
      spineState,
      isSpineActive: spineState !== null,
      spineDisplayLabel,
      openSpine,
      closeSpine,
      setActiveTab,
      openAttachmentPreview,
      closeAttachmentPreview,
      setSpineAttachmentOrigin,
    }),
    [
      spineState,
      spineDisplayLabel,
      openSpine,
      closeSpine,
      setActiveTab,
      openAttachmentPreview,
      closeAttachmentPreview,
      setSpineAttachmentOrigin,
    ]
  );

  return (
    <ConversationSpineContext.Provider value={value}>{children}</ConversationSpineContext.Provider>
  );
};

export const useConversationSpineContext = (): ConversationSpineContextValue => {
  const context = useContext(ConversationSpineContext);
  if (!context) {
    throw new Error('useConversationSpineContext must be used within a ConversationSpineProvider');
  }
  return context;
};

/** Optional hook for components that may render outside spine provider (embed tests). */
export const useOptionalConversationSpineContext = (): ConversationSpineContextValue | null =>
  useContext(ConversationSpineContext);
