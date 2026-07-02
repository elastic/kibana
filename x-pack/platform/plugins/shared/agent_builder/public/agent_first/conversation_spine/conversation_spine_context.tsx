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
import {
  AGENT_CART_FORCE_HIDE_APP_BREAKPOINT,
  AGENT_CART_PANEL_LAYOUT_TRANSITION_MS,
} from '../agent_cart_constants';
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

interface CartDismissOptions {
  restoreWorkspace?: boolean;
}

interface ConversationSpineContextValue {
  spineState: ConversationSpineState | null;
  isSpineActive: boolean;
  isCartFlyoutReady: boolean;
  hasAttachments: boolean;
  isAttachmentsEmptyOpen: boolean;
  spineDisplayLabel: string | null;
  promotedSpineType: SpineType;
  openSpine: (options?: OpenSpineOptions) => void;
  closeSpine: (options?: CartDismissOptions) => void;
  openAttachmentsEmptyOverlay: () => void;
  closeAttachmentsEmptyOverlay: (options?: CartDismissOptions) => void;
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
  const [isCartFlyoutDeferred, setIsCartFlyoutDeferred] = useState(false);
  const appWasForceHiddenRef = useRef(false);
  const prevConversationIdRef = useRef(conversationId);
  const isCartManagingApplicationWorkspaceRef = useRef(false);
  const cartFlyoutDeferTimeoutRef = useRef<number | undefined>(undefined);
  const cartWorkspaceRestoreTimeoutRef = useRef<number | undefined>(undefined);

  const clearCartFlyoutDeferTimeout = useCallback(() => {
    if (cartFlyoutDeferTimeoutRef.current !== undefined) {
      window.clearTimeout(cartFlyoutDeferTimeoutRef.current);
      cartFlyoutDeferTimeoutRef.current = undefined;
    }
  }, []);

  const clearCartWorkspaceRestoreTimeout = useCallback(() => {
    if (cartWorkspaceRestoreTimeoutRef.current !== undefined) {
      window.clearTimeout(cartWorkspaceRestoreTimeoutRef.current);
      cartWorkspaceRestoreTimeoutRef.current = undefined;
    }
  }, []);

  const deferCartFlyoutUntilWorkspaceTransition = useCallback(() => {
    clearCartFlyoutDeferTimeout();
    setIsCartFlyoutDeferred(true);
    cartFlyoutDeferTimeoutRef.current = window.setTimeout(() => {
      setIsCartFlyoutDeferred(false);
      cartFlyoutDeferTimeoutRef.current = undefined;
    }, AGENT_CART_PANEL_LAYOUT_TRANSITION_MS);
  }, [clearCartFlyoutDeferTimeout]);

  useEffect(() => {
    return () => {
      clearCartFlyoutDeferTimeout();
      clearCartWorkspaceRestoreTimeout();
    };
  }, [clearCartFlyoutDeferTimeout, clearCartWorkspaceRestoreTimeout]);

  const clearApplicationWorkspaceForceHiddenFlag = useCallback(() => {
    appWasForceHiddenRef.current = false;
  }, []);

  const restoreApplicationWorkspaceIfForceHidden = useCallback(() => {
    const shouldRestore = appWasForceHiddenRef.current;
    appWasForceHiddenRef.current = false;

    if (!shouldRestore || chrome.applicationWorkspace.getIsOpen()) {
      return;
    }

    clearCartWorkspaceRestoreTimeout();
    cartWorkspaceRestoreTimeoutRef.current = window.setTimeout(() => {
      chrome.applicationWorkspace.open();
      cartWorkspaceRestoreTimeoutRef.current = undefined;
    }, AGENT_CART_PANEL_LAYOUT_TRANSITION_MS);
  }, [chrome, clearCartWorkspaceRestoreTimeout]);

  const prepareApplicationWorkspaceForCartOpen = useCallback(() => {
    if (window.innerWidth < AGENT_CART_FORCE_HIDE_APP_BREAKPOINT) {
      const wasApplicationWorkspaceOpen = chrome.applicationWorkspace.getIsOpen();
      if (wasApplicationWorkspaceOpen) {
        isCartManagingApplicationWorkspaceRef.current = true;
        chrome.applicationWorkspace.close();
        isCartManagingApplicationWorkspaceRef.current = false;
        appWasForceHiddenRef.current = true;
        deferCartFlyoutUntilWorkspaceTransition();
      } else {
        appWasForceHiddenRef.current = false;
        clearCartFlyoutDeferTimeout();
        setIsCartFlyoutDeferred(false);
      }
      return;
    }

    appWasForceHiddenRef.current = false;
    clearCartFlyoutDeferTimeout();
    setIsCartFlyoutDeferred(false);
  }, [chrome, clearCartFlyoutDeferTimeout, deferCartFlyoutUntilWorkspaceTransition]);

  const closeSpine = useCallback(
    ({ restoreWorkspace = true }: CartDismissOptions = {}) => {
      setSpineState(null);
      clearCartFlyoutDeferTimeout();
      setIsCartFlyoutDeferred(false);
      if (restoreWorkspace) {
        restoreApplicationWorkspaceIfForceHidden();
      }
    },
    [clearCartFlyoutDeferTimeout, restoreApplicationWorkspaceIfForceHidden]
  );

  const closeAttachmentsEmptyOverlay = useCallback(
    ({ restoreWorkspace = true }: CartDismissOptions = {}) => {
      setIsAttachmentsEmptyOpen(false);
      clearCartFlyoutDeferTimeout();
      setIsCartFlyoutDeferred(false);
      if (restoreWorkspace) {
        restoreApplicationWorkspaceIfForceHidden();
      }
    },
    [clearCartFlyoutDeferTimeout, restoreApplicationWorkspaceIfForceHidden]
  );

  useEffect(() => {
    return chrome.applicationWorkspace.registerOnClose(() => {
      if (isCartManagingApplicationWorkspaceRef.current) {
        return;
      }

      closeSpine({ restoreWorkspace: false });
      closeAttachmentsEmptyOverlay({ restoreWorkspace: false });
      clearApplicationWorkspaceForceHiddenFlag();
    });
  }, [chrome, clearApplicationWorkspaceForceHiddenFlag, closeAttachmentsEmptyOverlay, closeSpine]);

  const openAttachmentsEmptyOverlay = useCallback(() => {
    prepareApplicationWorkspaceForCartOpen();
    closeSpine({ restoreWorkspace: false });
    setIsAttachmentsEmptyOpen(true);
  }, [closeSpine, prepareApplicationWorkspaceForCartOpen]);

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
      closeSpine({ restoreWorkspace: false });
      closeAttachmentsEmptyOverlay({ restoreWorkspace: false });
      clearApplicationWorkspaceForceHiddenFlag();
      setPromotedSpineType('chat');
    }

    prevConversationIdRef.current = conversationId;
  }, [clearApplicationWorkspaceForceHiddenFlag, closeAttachmentsEmptyOverlay, closeSpine, conversationId]);

  const prevHasAttachmentsRef = useRef(hasAttachments);
  useEffect(() => {
    if (prevHasAttachmentsRef.current && !hasAttachments) {
      closeSpine({ restoreWorkspace: false });
      closeAttachmentsEmptyOverlay({ restoreWorkspace: false });
      clearApplicationWorkspaceForceHiddenFlag();
    }
    prevHasAttachmentsRef.current = hasAttachments;
  }, [clearApplicationWorkspaceForceHiddenFlag, closeAttachmentsEmptyOverlay, closeSpine, hasAttachments]);

  const openSpine = useCallback(
    (options?: OpenSpineOptions) => {
      if (!hasAttachments) {
        return;
      }

      prepareApplicationWorkspaceForCartOpen();
      closeAttachmentsEmptyOverlay({ restoreWorkspace: false });

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
    [
      closeAttachmentsEmptyOverlay,
      hasAttachments,
      prepareApplicationWorkspaceForCartOpen,
      promotedSpineType,
      spineConversationId,
    ]
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
  const isCartFlyoutReady = !isCartFlyoutDeferred;

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
      isCartFlyoutReady,
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
      isCartFlyoutReady,
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
