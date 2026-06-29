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
import { useActiveConversationAttachmentCount } from '../../application/hooks/use_active_conversation_attachment_count';
import { useKibana } from '../../application/hooks/use_kibana';
import { formatSpineDisplayLabel } from './hooks/use_spine_display_label';
import { formatSpineIdentifier } from './hooks/use_spine_identifier';
import { getSpineConversationId, PROVISIONAL_SPINE_CONVERSATION_ID } from './provisional_spine_conversation_id';
import {
  getDefaultTabForSpineType,
  isValidTabForSpineType,
} from './spine_type_config';
import type {
  ConversationSpineRecord,
  ConversationSpineState,
  OpenSpineOptions,
  SpineTabId,
  SpineType,
} from './types';

interface ConversationSpineContextValue {
  spineState: ConversationSpineState | null;
  isSpineActive: boolean;
  hasAttachments: boolean;
  isAttachmentsEmptyOpen: boolean;
  spineDisplayLabel: string | null;
  promotedSpineType: SpineType;
  openSpine: (options?: OpenSpineOptions) => void;
  closeSpine: () => void;
  openAttachmentsEmptyOverlay: () => void;
  closeAttachmentsEmptyOverlay: () => void;
  setSpineType: (type: SpineType) => void;
  setActiveTab: (tabId: SpineTabId) => void;
  openAttachmentPreview: (attachment: UnknownAttachment) => void;
  closeAttachmentPreview: () => void;
  setSpineAttachmentOrigin: (origin: string) => void;
}

const ConversationSpineContext = createContext<ConversationSpineContextValue | null>(null);

const buildSpineRecord = (conversationId: string, type: SpineType): ConversationSpineRecord => ({
  type,
  identifier: formatSpineIdentifier(conversationId),
  conversationId,
});

interface ConversationSpineProviderProps {
  children: React.ReactNode;
}

export const ConversationSpineProvider: React.FC<ConversationSpineProviderProps> = ({ children }) => {
  const {
    services: { chrome },
  } = useKibana();
  const conversationId = useConversationId();
  const spineConversationId = getSpineConversationId(conversationId);
  const attachmentCount = useActiveConversationAttachmentCount();
  const hasAttachments = attachmentCount > 0;

  const [spineState, setSpineState] = useState<ConversationSpineState | null>(null);
  const [promotedSpineType, setPromotedSpineType] = useState<SpineType>('chat');
  const [isAttachmentsEmptyOpen, setIsAttachmentsEmptyOpen] = useState(false);
  const prevConversationIdRef = useRef(conversationId);

  const closeSpine = useCallback(() => {
    setSpineState(null);
  }, []);

  const closeAttachmentsEmptyOverlay = useCallback(() => {
    setIsAttachmentsEmptyOpen(false);
  }, []);

  const openApplicationWorkspace = useCallback(() => {
    chrome.applicationWorkspace.open();
  }, [chrome]);

  useEffect(() => {
    return chrome.applicationWorkspace.registerOnClose(() => {
      closeSpine();
      closeAttachmentsEmptyOverlay();
    });
  }, [chrome, closeAttachmentsEmptyOverlay, closeSpine]);

  const openAttachmentsEmptyOverlay = useCallback(() => {
    openApplicationWorkspace();
    closeSpine();
    setIsAttachmentsEmptyOpen(true);
  }, [closeSpine, openApplicationWorkspace]);

  useEffect(() => {
    const previousConversationId = prevConversationIdRef.current;
    if (previousConversationId === conversationId) {
      return;
    }

    if (previousConversationId === undefined && conversationId) {
      setSpineState((current) => {
        if (
          !current ||
          current.record.conversationId !== PROVISIONAL_SPINE_CONVERSATION_ID
        ) {
          return current;
        }

        return {
          ...current,
          record: {
            ...current.record,
            conversationId,
            identifier: formatSpineIdentifier(conversationId),
          },
        };
      });
    } else {
      closeSpine();
      closeAttachmentsEmptyOverlay();
      setPromotedSpineType('chat');
    }

    prevConversationIdRef.current = conversationId;
  }, [closeAttachmentsEmptyOverlay, closeSpine, conversationId]);

  const prevHasAttachmentsRef = useRef(hasAttachments);
  useEffect(() => {
    if (prevHasAttachmentsRef.current && !hasAttachments) {
      closeSpine();
      closeAttachmentsEmptyOverlay();
    }
    prevHasAttachmentsRef.current = hasAttachments;
  }, [closeAttachmentsEmptyOverlay, closeSpine, hasAttachments]);

  const openSpine = useCallback(
    (options?: OpenSpineOptions) => {
      if (!hasAttachments) {
        return;
      }

      openApplicationWorkspace();
      closeAttachmentsEmptyOverlay();

      const isSidebar = options?.isSidebar ?? false;
      const record = buildSpineRecord(spineConversationId, promotedSpineType);
      const defaultTabId = options?.tabId ?? getDefaultTabForSpineType(promotedSpineType);

      setSpineState({
        record,
        activeTabId: defaultTabId,
        attachmentsView: options?.attachmentsView ?? { mode: 'grid' },
        isSidebar,
      });
    },
    [closeAttachmentsEmptyOverlay, hasAttachments, openApplicationWorkspace, promotedSpineType, spineConversationId]
  );

  const setSpineType = useCallback(
    (type: SpineType) => {
      if (type === promotedSpineType) {
        return;
      }

      setPromotedSpineType(type);
      setSpineState((prev) => {
        if (!prev) {
          return prev;
        }

        const activeTabId = isValidTabForSpineType(type, prev.activeTabId)
          ? prev.activeTabId
          : getDefaultTabForSpineType(type);

        return {
          ...prev,
          record: { ...prev.record, type },
          activeTabId,
        };
      });
    },
    [promotedSpineType]
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

  const isSpineActive = spineState !== null;

  const spineDisplayLabel = useMemo(() => {
    if (!hasAttachments) {
      return null;
    }

    if (spineState) {
      return formatSpineDisplayLabel(spineState.record.type, spineState.record.identifier);
    }

    return formatSpineDisplayLabel(
      promotedSpineType,
      formatSpineIdentifier(spineConversationId)
    );
  }, [hasAttachments, promotedSpineType, spineConversationId, spineState]);

  const value = useMemo(
    () => ({
      spineState,
      isSpineActive,
      hasAttachments,
      isAttachmentsEmptyOpen,
      spineDisplayLabel,
      promotedSpineType,
      openSpine,
      closeSpine,
      openAttachmentsEmptyOverlay,
      closeAttachmentsEmptyOverlay,
      setSpineType,
      setActiveTab,
      openAttachmentPreview,
      closeAttachmentPreview,
      setSpineAttachmentOrigin,
    }),
    [
      spineState,
      isSpineActive,
      hasAttachments,
      isAttachmentsEmptyOpen,
      spineDisplayLabel,
      promotedSpineType,
      openSpine,
      closeSpine,
      openAttachmentsEmptyOverlay,
      closeAttachmentsEmptyOverlay,
      setSpineType,
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
