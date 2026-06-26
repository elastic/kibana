/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import type { ChangeHistoryBadgeRenderFn } from '../types/change_history_badge';
import type {
  ChangeHistoryFeatures,
  ChangeHistoryPermissions,
} from '../types/change_history_features';
import type { ChangeHistoryLabels } from '../types/change_history_labels';
import type { ChangeHistoryPreviewFooterRenderFn } from '../types/change_history_preview_footer';
import type { ChangeHistoryPreviewRenderFn } from '../types/change_history_preview';
import type { ChangeHistoryOnRestoreSuccessArgs } from './change_history_context';
import { ChangeHistoryContext } from './change_history_context';
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
  isReadOnly?: boolean;
  onRestoreSuccess?: (args: ChangeHistoryOnRestoreSuccessArgs) => void;
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
  isReadOnly,
  onRestoreSuccess,
  children,
}: ChangeHistoryProviderProps): JSX.Element => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChangeId, setSelectedChangeId] = useState<string | undefined>();
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
    () => resolveChangeHistorySupports(adapter, { features, permissions, isReadOnly }),
    [adapter, features, isReadOnly, permissions]
  );

  const value = useMemo(
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
      onRestoreSuccess,
      isModalOpen,
      openModal,
      closeModal,
      selectedChangeId,
      setSelectedChangeId: handleSelectChangeId,
    }),
    [
      adapter,
      closeModal,
      handleSelectChangeId,
      isModalOpen,
      labels?.modalTitle,
      labels?.previewBackLabel,
      labels?.previewTitle,
      labels?.timelinePanelTitle,
      objectId,
      onRestoreSuccess,
      openModal,
      renderBadge,
      renderPreview,
      renderPreviewFooter,
      selectedChangeId,
      supports,
    ]
  );

  return <ChangeHistoryContext.Provider value={value}>{children}</ChangeHistoryContext.Provider>;
};
