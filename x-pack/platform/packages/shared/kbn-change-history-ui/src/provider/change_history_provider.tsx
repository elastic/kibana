/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeHistoryBadgeRenderFn } from '../types/change_history_badge';
import type {
  ChangeHistoryFeatures,
  ChangeHistoryPermissions,
} from '../types/change_history_features';
import type { ChangeHistoryLabels } from '../types/change_history_labels';
import type { ChangeHistoryPreviewRenderFn } from '../types/change_history_preview';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import { useChangeHistoryList } from '../hooks/use_change_history_list';
import { ChangeHistoryConfigContext } from './change_history_config_context';
import { ChangeHistoryStateContext } from './change_history_state_context';
import { resolveChangeHistorySupports } from './resolve_change_history_supports';
import * as i18n from '../components/timeline/translations';

export interface ChangeHistoryProviderProps {
  objectId: string;
  adapter: ChangeHistoryAdapter;
  renderPreview: ChangeHistoryPreviewRenderFn;
  renderBadge?: ChangeHistoryBadgeRenderFn;
  labels: ChangeHistoryLabels;
  features?: ChangeHistoryFeatures;
  permissions?: ChangeHistoryPermissions;
  children: React.ReactNode;
}

export const ChangeHistoryProvider = ({
  objectId,
  adapter,
  renderPreview,
  renderBadge,
  labels,
  features,
  permissions,
  children,
}: ChangeHistoryProviderProps): JSX.Element => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChangeId, setSelectedChangeId] = useState<string | undefined>();
  const [prevObjectId, setPrevObjectId] = useState(objectId);

  // The provider owns the list query so the list, its refetch, and selection
  // live in one place — no cross-subtree ref plumbing required.
  const { items, total, isLoading, isLoadingMore, error, loadMore, refetch } = useChangeHistoryList({
    adapter,
    objectId,
    enabled: isModalOpen,
  });

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

  const refetchAndSelectCurrent = useCallback(async (): Promise<void> => {
    const result = await refetch();
    const currentChangeId = result?.items[0]?.id;
    if (currentChangeId) {
      setSelectedChangeId(currentChangeId);
    }
  }, [refetch]);

  // Auto-select the most recent change when the modal opens with no selection.
  useEffect(() => {
    if (!isModalOpen || selectedChangeId || isLoading || items.length === 0) {
      return;
    }

    setSelectedChangeId(items[0]?.id);
  }, [isModalOpen, isLoading, items, selectedChangeId]);

  const supports = useMemo(
    () => resolveChangeHistorySupports(adapter, { features, permissions }),
    [adapter, features, permissions]
  );

  const configValue = useMemo(
    () => ({
      objectId,
      adapter,
      renderPreview,
      renderBadge,
      labels: {
        previewBackLabel: labels.previewBackLabel ?? i18n.BACK_TO_HOST,
        previewTitle: labels.previewTitle,
      },
      supports,
      isOpen: isModalOpen,
    }),
    [
      adapter,
      isModalOpen,
      labels.previewBackLabel,
      labels.previewTitle,
      objectId,
      renderBadge,
      renderPreview,
      supports,
    ]
  );

  const stateValue = useMemo(
    () => ({
      isModalOpen,
      openModal,
      closeModal,
      selectedChangeId,
      setSelectedChangeId,
      items,
      total,
      isLoading,
      isLoadingMore,
      error,
      loadMore,
      refetchAndSelectCurrent,
    }),
    [
      isModalOpen,
      openModal,
      closeModal,
      selectedChangeId,
      items,
      total,
      isLoading,
      isLoadingMore,
      error,
      loadMore,
      refetchAndSelectCurrent,
    ]
  );

  return (
    <ChangeHistoryConfigContext.Provider value={configValue}>
      <ChangeHistoryStateContext.Provider value={stateValue}>
        {children}
      </ChangeHistoryStateContext.Provider>
    </ChangeHistoryConfigContext.Provider>
  );
};
