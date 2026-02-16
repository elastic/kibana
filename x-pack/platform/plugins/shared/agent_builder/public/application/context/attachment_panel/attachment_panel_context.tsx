/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface AttachmentPanelContextValue {
  /** Whether the attachment panel is currently open */
  isPanelOpen: boolean;
  /** The currently selected attachment ID */
  attachmentId: string | undefined;
  /** Open the attachment panel with an attachment ID */
  openPanel: (attachmentId: string) => void;
  /** Close the attachment panel */
  closePanel: () => void;
  /** Toggle the attachment panel */
  togglePanel: () => void;
}

const AttachmentPanelContext = createContext<AttachmentPanelContextValue | undefined>(undefined);

interface AttachmentPanelProviderProps {
  children: React.ReactNode;
}

export const AttachmentPanelProvider: React.FC<AttachmentPanelProviderProps> = ({ children }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [attachmentId, setAttachmentId] = useState<string | undefined>(undefined);

  const openPanel = useCallback((id: string) => {
    setAttachmentId(id);
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const value = useMemo<AttachmentPanelContextValue>(
    () => ({
      isPanelOpen,
      attachmentId,
      openPanel,
      closePanel,
      togglePanel,
    }),
    [isPanelOpen, attachmentId, openPanel, closePanel, togglePanel]
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
