/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { animate } from 'framer-motion';

export interface AttachmentEntry {
  /** Unique attachment identifier */
  id: string;
  /** Human-readable title for the attachment */
  title: string;
}

interface AttachmentPanelContextValue {
  /** Whether the attachment panel is currently open */
  isPanelOpen: boolean;
  /** The currently selected attachment ID */
  attachmentId: string | undefined;
  /** All registered attachments, in order */
  attachments: AttachmentEntry[];
  /** Temp titles set by the user (ephemeral, lost on refresh) */
  tempTitles: Record<string, string>;
  /** Set a temp title for an attachment (demo only, not persisted) */
  setTempTitle: (attachmentId: string, tempTitle: string) => void;
  /** Register an attachment so it appears in the navigator (idempotent) */
  registerAttachment: (id: string, title?: string) => void;
  /** Open the attachment panel with an attachment ID and optional title */
  openPanel: (attachmentId: string, title?: string) => void;
  /** Close the attachment panel */
  closePanel: () => void;
  /** Toggle the attachment panel */
  togglePanel: () => void;
  /** Navigate to a specific attachment by ID */
  navigateToAttachment: (id: string) => void;
  /** Navigate to the previous attachment in the list */
  navigateToPrevious: () => void;
  /** Navigate to the next attachment in the list */
  navigateToNext: () => void;
  /** Smooth-scroll the chat container to the attachment element in the conversation */
  scrollToAttachmentInChat: (id: string) => void;
  /** Ref to register the chat scroll container */
  chatScrollContainerRef: React.RefObject<HTMLElement | null>;
}

const AttachmentPanelContext = createContext<AttachmentPanelContextValue | undefined>(undefined);

interface AttachmentPanelProviderProps {
  children: React.ReactNode;
}

/**
 * Derives a human-readable title from an attachment ID when no explicit title is provided.
 * Attempts to extract meaningful segments from UUID-like or path-like IDs.
 */
const deriveTitle = (id: string, index: number): string => {
  // If the ID looks like a file path, use the filename
  if (id.includes('/')) {
    const filename = id.split('/').pop() ?? id;
    return filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
  }

  // If it looks like a descriptive slug (contains hyphens or underscores), humanise it
  if (/[_-]/.test(id) && !/^[0-9a-f-]{36}$/.test(id)) {
    return id
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  // Fallback: numbered label
  return `Attachment ${index + 1}`;
};

export const AttachmentPanelProvider: React.FC<AttachmentPanelProviderProps> = ({ children }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [attachmentId, setAttachmentId] = useState<string | undefined>(undefined);
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [tempTitles, setTempTitles] = useState<Record<string, string>>({});
  const chatScrollContainerRef = useRef<HTMLElement | null>(null);

  const setTempTitle = useCallback((id: string, tempTitle: string) => {
    setTempTitles((prev) => ({ ...prev, [id]: tempTitle }));
  }, []);

  const registerAttachment = useCallback((id: string, title?: string) => {
    setAttachments((prev) => {
      if (prev.some((entry) => entry.id === id)) return prev;
      const resolvedTitle = title ?? deriveTitle(id, prev.length);
      return [...prev, { id, title: resolvedTitle }];
    });
  }, []);

  const openPanel = useCallback((id: string, title?: string) => {
    setAttachmentId(id);
    setIsPanelOpen(true);
    registerAttachment(id, title);
  }, [registerAttachment]);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const navigateToAttachment = useCallback((id: string) => {
    setAttachmentId(id);
  }, []);

  const navigateToPrevious = useCallback(() => {
    setAttachmentId((current) => {
      const currentIndex = current ? attachments.findIndex((a) => a.id === current) : -1;
      if (currentIndex > 0) {
        return attachments[currentIndex - 1].id;
      }
      return current;
    });
  }, [attachments]);

  const navigateToNext = useCallback(() => {
    setAttachmentId((current) => {
      const currentIndex = current ? attachments.findIndex((a) => a.id === current) : -1;
      if (currentIndex >= 0 && currentIndex < attachments.length - 1) {
        return attachments[currentIndex + 1].id;
      }
      return current;
    });
  }, [attachments]);

  const scrollToAttachmentInChat = useCallback((id: string) => {
    const container = chatScrollContainerRef.current;
    if (!container) return;

    const target = container.querySelector(`[data-attachment-id="${id}"]`);
    if (!target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetScrollTop =
      container.scrollTop + targetRect.top - containerRect.top - containerRect.height * 0.15;

    animate(container.scrollTop, targetScrollTop, {
      type: 'spring',
      stiffness: 120,
      damping: 20,
      mass: 0.8,
      onUpdate: (v) => {
        container.scrollTop = v;
      },
    });
  }, []);

  const value = useMemo<AttachmentPanelContextValue>(
    () => ({
      isPanelOpen,
      attachmentId,
      attachments,
      tempTitles,
      setTempTitle,
      registerAttachment,
      openPanel,
      closePanel,
      togglePanel,
      navigateToAttachment,
      navigateToPrevious,
      navigateToNext,
      scrollToAttachmentInChat,
      chatScrollContainerRef,
    }),
    [
      isPanelOpen,
      attachmentId,
      attachments,
      tempTitles,
      setTempTitle,
      registerAttachment,
      openPanel,
      closePanel,
      togglePanel,
      navigateToAttachment,
      navigateToPrevious,
      navigateToNext,
      scrollToAttachmentInChat,
    ]
  );

  return (
    <AttachmentPanelContext.Provider value={value}>{children}</AttachmentPanelContext.Provider>
  );
};

export const useAttachmentPanel = (): AttachmentPanelContextValue => {
  const context = useContext(AttachmentPanelContext);
  if (!context) {
    throw new Error('useAttachmentPanel must be used within an AttachmentPanelProvider');
  }
  return context;
};
