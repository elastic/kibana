/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { ChangeHistoryBadgeRenderFn } from '../types/change_history_badge';
import type {
  ChangeHistoryFeatures,
  ChangeHistoryPermissions,
} from '../types/change_history_features';
import type { ChangeHistoryLabels } from '../types/change_history_labels';
import type { ChangeHistoryPreviewFooterRenderFn } from '../types/change_history_preview_footer';
import type { ChangeHistoryPreviewRenderFn } from '../types/change_history_preview';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import { ChangeHistoryConfigContext } from './change_history_config_context';
import { ChangeHistoryInternalConfigContext } from './change_history_internal_config_context';
import { resolveChangeHistorySupports } from './resolve_change_history_supports';
import * as i18n from '../components/timeline/translations';

export interface ChangeHistoryProviderProps {
  objectId: string;
  adapter: ChangeHistoryAdapter;
  renderPreview: ChangeHistoryPreviewRenderFn;
  renderPreviewFooter?: ChangeHistoryPreviewFooterRenderFn;
  renderBadge?: ChangeHistoryBadgeRenderFn;
  labels?: ChangeHistoryLabels;
  features?: ChangeHistoryFeatures;
  permissions?: ChangeHistoryPermissions;
  children: React.ReactNode;
}

export const ChangeHistoryProvider = ({
  objectId,
  adapter,
  renderPreview,
  renderPreviewFooter,
  renderBadge,
  labels,
  features,
  permissions,
  children,
}: ChangeHistoryProviderProps): JSX.Element => {
  const listRefetchRef = useRef<(() => Promise<void> | void) | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChangeId, setSelectedChangeId] = useState<string | undefined>();
  const [isListRefreshPending, setIsListRefreshPending] = useState(false);
  const [prevObjectId, setPrevObjectId] = useState(objectId);

  if (objectId !== prevObjectId) {
    setPrevObjectId(objectId);
    setSelectedChangeId(undefined);
    setIsModalOpen(false);
  }

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedChangeId(undefined);
  }, []);

  const handleSelectChangeId = useCallback((changeId: string | undefined) => {
    setSelectedChangeId(changeId);
  }, []);

  const supports = useMemo(
    () => resolveChangeHistorySupports(adapter, { features, permissions }),
    [adapter, features, permissions]
  );

  const registerListRefetch = useCallback((refetch: (() => Promise<void> | void) | undefined) => {
    listRefetchRef.current = refetch;
  }, []);

  const refetchList = useCallback(async () => {
    setSelectedChangeId(undefined);
    await listRefetchRef.current?.();
  }, []);

  const configValue = useMemo(
    () => ({
      objectId,
      adapter,
      renderPreview,
      renderPreviewFooter,
      renderBadge,
      labels: {
        previewBackLabel: labels?.previewBackLabel ?? i18n.BACK_TO_HOST,
        previewTitle: labels?.previewTitle ?? labels?.modalTitle ?? '',
        timelinePanelTitle: labels?.timelinePanelTitle ?? i18n.TIMELINE_PANEL_TITLE,
      },
      supports,
    }),
    [
      adapter,
      labels?.modalTitle,
      labels?.previewBackLabel,
      labels?.previewTitle,
      labels?.timelinePanelTitle,
      objectId,
      renderBadge,
      renderPreview,
      renderPreviewFooter,
      supports,
    ]
  );

  const internalConfigValue = useMemo(
    () => ({
      refetchList,
      registerListRefetch,
      isListRefreshPending,
      setListRefreshPending: setIsListRefreshPending,
      isModalOpen,
      openModal,
      closeModal,
      selectedChangeId,
      setSelectedChangeId: handleSelectChangeId,
    }),
    [
      closeModal,
      handleSelectChangeId,
      isListRefreshPending,
      isModalOpen,
      openModal,
      refetchList,
      registerListRefetch,
      selectedChangeId,
    ]
  );

  return (
    <ChangeHistoryConfigContext.Provider value={configValue}>
      <ChangeHistoryInternalConfigContext.Provider value={internalConfigValue}>
        {children}
      </ChangeHistoryInternalConfigContext.Provider>
    </ChangeHistoryConfigContext.Provider>
  );
};
