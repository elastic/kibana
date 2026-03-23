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
  version?: number;
}

export const getAttachmentPreviewKey = (attachmentId: string, version?: number) =>
  `${attachmentId}:${version ?? 'latest'}`;

interface CanvasContextValue {
  canvasState: CanvasState | null;
  previewedAttachmentKey: string | null;
  openCanvas: (attachment: UnknownAttachment, isSidebar: boolean, version?: number) => void;
  closeCanvas: () => void;
  setCanvasAttachmentOrigin: (origin: string) => void;
  setPreviewedAttachmentKey: (attachmentKey: string | null) => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

interface CanvasProviderProps {
  children: React.ReactNode;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [canvasState, setCanvasState] = useState<CanvasState | null>(null);
  const [previewedAttachmentKey, setPreviewedAttachmentKey] = useState<string | null>(null);

  const openCanvas = useCallback(
    (attachment: UnknownAttachment, isSidebar: boolean, version?: number) => {
      setCanvasState({ attachment, isSidebar, version });
      setPreviewedAttachmentKey(getAttachmentPreviewKey(attachment.id, version));
    },
    []
  );

  const closeCanvas = useCallback(() => {
    if (canvasState) {
      const canvasPreviewKey = getAttachmentPreviewKey(
        canvasState.attachment.id,
        canvasState.version
      );
      if (previewedAttachmentKey === canvasPreviewKey) {
        setPreviewedAttachmentKey(null);
      }
    }
    setCanvasState(null);
  }, [canvasState, previewedAttachmentKey]);

  const setCanvasAttachmentOrigin = useCallback((origin: string) => {
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
      previewedAttachmentKey,
      setPreviewedAttachmentKey,
    }),
    [canvasState, previewedAttachmentKey, openCanvas, closeCanvas, setCanvasAttachmentOrigin]
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
