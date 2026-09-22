/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

import type { DataStreamResponse } from '../../../../common';
import type { UIStateContextValue } from './types';

const UIStateContext = createContext<UIStateContextValue | undefined>(undefined);

export interface UIStateProviderProps {
  children: React.ReactNode;
}

export const UIStateProvider: React.FC<UIStateProviderProps> = ({ children }) => {
  const [isCreateDataStreamFlyoutOpen, setIsCreateDataStreamFlyoutOpen] = useState(false);
  const [selectedDataStream, setSelectedDataStream] = useState<DataStreamResponse | null>(null);
  const [selectedPipelineTab, setSelectedPipelineTab] = useState<'table' | 'pipeline'>('table');

  const openCreateDataStreamFlyout = useCallback(() => {
    setIsCreateDataStreamFlyoutOpen(true);
  }, []);

  const closeCreateDataStreamFlyout = useCallback(() => {
    setIsCreateDataStreamFlyoutOpen(false);
  }, []);

  const openEditPipelineFlyout = useCallback((dataStream: DataStreamResponse) => {
    setSelectedDataStream(dataStream);
  }, []);

  const closeEditPipelineFlyout = useCallback(() => {
    setSelectedDataStream(null);
  }, []);

  const selectPipelineTab = useCallback((tab: 'table' | 'pipeline') => {
    setSelectedPipelineTab(tab);
  }, []);

  const isEditPipelineFlyoutOpen = selectedDataStream !== null;

  const value = useMemo<UIStateContextValue>(
    () => ({
      isCreateDataStreamFlyoutOpen,
      openCreateDataStreamFlyout,
      closeCreateDataStreamFlyout,
      isEditPipelineFlyoutOpen,
      selectedDataStream,
      openEditPipelineFlyout,
      closeEditPipelineFlyout,
      selectedPipelineTab,
      selectPipelineTab,
    }),
    [
      isCreateDataStreamFlyoutOpen,
      closeCreateDataStreamFlyout,
      openCreateDataStreamFlyout,
      isEditPipelineFlyoutOpen,
      selectedDataStream,
      openEditPipelineFlyout,
      closeEditPipelineFlyout,
      selectedPipelineTab,
      selectPipelineTab,
    ]
  );

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
};

export const useUIState = (): UIStateContextValue => {
  const context = useContext(UIStateContext);

  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }

  return context;
};
