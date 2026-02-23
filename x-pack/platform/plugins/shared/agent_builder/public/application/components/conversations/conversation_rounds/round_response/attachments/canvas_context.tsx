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
}

interface CanvasContextValue {
  canvasState: CanvasState | null;
  openCanvas: (attachment: UnknownAttachment, isSidebar: boolean) => void;
  closeCanvas: () => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

interface CanvasProviderProps {
  children: React.ReactNode;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [canvasState, setCanvasState] = useState<CanvasState | null>(null);

  const openCanvas = useCallback((attachment: UnknownAttachment, isSidebar: boolean) => {
    setCanvasState({ attachment, isSidebar });
  }, []);

  const closeCanvas = useCallback(() => {
    setCanvasState(null);
  }, []);

  const value = useMemo(
    () => ({ canvasState, openCanvas, closeCanvas }),
    [canvasState, openCanvas, closeCanvas]
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
