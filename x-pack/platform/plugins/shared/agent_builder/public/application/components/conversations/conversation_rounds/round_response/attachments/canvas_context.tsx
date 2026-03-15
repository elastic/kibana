/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';

interface CanvasState {
  attachment: UnknownAttachment;
  isSidebar: boolean;
  /** Version number of the attachment being previewed */
  version?: number;
  /** When true, automatically update to show the latest version when new versions arrive */
  followLatest: boolean;
}

interface CanvasContextValue {
  canvasState: CanvasState | null;
  openCanvas: (attachment: UnknownAttachment, isSidebar: boolean, version?: number) => void;
  closeCanvas: () => void;
  setCanvasAttachmentOrigin: (origin: unknown) => void;
  /** Update canvas with new attachment data (used for live updates when following latest) */
  updateCanvasAttachment: (attachment: UnknownAttachment, version: number) => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

interface CanvasProviderProps {
  children: React.ReactNode;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [canvasState, setCanvasState] = useState<CanvasState | null>(null);

  const openCanvas = useCallback(
    (attachment: UnknownAttachment, isSidebar: boolean, version?: number) => {
      // If no version specified, follow latest; otherwise show specific version
      const followLatest = version === undefined;
      setCanvasState({ attachment, isSidebar, version, followLatest });
    },
    []
  );

  const updateCanvasAttachment = useCallback((attachment: UnknownAttachment, version: number) => {
    setCanvasState((prev) => {
      if (!prev || !prev.followLatest) return prev;
      return { ...prev, attachment, version };
    });
  }, []);

  const closeCanvas = useCallback(() => {
    setCanvasState(null);
  }, []);

  const setCanvasAttachmentOrigin = useCallback((origin: unknown) => {
    setCanvasState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        attachment: { ...prev.attachment, origin },
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      canvasState,
      openCanvas,
      closeCanvas,
      setCanvasAttachmentOrigin,
      updateCanvasAttachment,
    }),
    [canvasState, openCanvas, closeCanvas, setCanvasAttachmentOrigin, updateCanvasAttachment]
  );

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
};

export const useCanvasContext = (): CanvasContextValue => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
};
