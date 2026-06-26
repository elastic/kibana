/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { registerOpenAttachmentCartHandler } from '../../../../../../agent_first/attachment_coordinator/coordinator_bridge';

export type CanvasState =
  | { mode: 'attachment'; attachment: UnknownAttachment; isSidebar: boolean }
  | { mode: 'cart'; isSidebar: boolean };

export const getAttachmentPreviewKey = (attachmentId: string, version?: number) =>
  `${attachmentId}:${version ?? 'latest'}`;

interface CanvasContextValue {
  canvasState: CanvasState | null;
  previewedAttachmentKey: string | null;
  openCanvas: (attachment: UnknownAttachment, isSidebar: boolean) => void;
  openAttachmentCart: (isSidebar: boolean) => void;
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

  const openCanvas = useCallback((attachment: UnknownAttachment, isSidebar: boolean) => {
    setCanvasState({ mode: 'attachment', attachment, isSidebar });
    setPreviewedAttachmentKey(getAttachmentPreviewKey(attachment.id, attachment.version));
  }, []);

  const openAttachmentCart = useCallback((isSidebar: boolean) => {
    setCanvasState({ mode: 'cart', isSidebar });
  }, []);

  useEffect(() => {
    registerOpenAttachmentCartHandler(openAttachmentCart);

    return () => {
      registerOpenAttachmentCartHandler(null);
    };
  }, [openAttachmentCart]);

  const closeCanvas = useCallback(() => {
    setCanvasState((prev) => {
      if (prev?.mode === 'attachment') {
        const canvasPreviewKey = getAttachmentPreviewKey(
          prev.attachment.id,
          prev.attachment.version
        );
        setPreviewedAttachmentKey((currentKey) =>
          currentKey === canvasPreviewKey ? null : currentKey
        );
      }
      return null;
    });
  }, []);

  const setCanvasAttachmentOrigin = useCallback((origin: string) => {
    setCanvasState((prev) => {
      if (!prev || prev.mode !== 'attachment') {
        return prev;
      }
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
      openAttachmentCart,
      closeCanvas,
      setCanvasAttachmentOrigin,
      previewedAttachmentKey,
      setPreviewedAttachmentKey,
    }),
    [
      canvasState,
      previewedAttachmentKey,
      openCanvas,
      openAttachmentCart,
      closeCanvas,
      setCanvasAttachmentOrigin,
    ]
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
