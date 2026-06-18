/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import type { ChangeHistoryBadgeRenderFn } from '../types/change_history_badge';
import type { ChangeHistoryLabels } from '../types/change_history_labels';
import type { ChangeHistoryPreviewRenderFn } from '../types/change_history_preview';
import { ChangeHistoryContext } from './change_history_context';
import * as i18n from '../components/timeline/translations';

export interface ChangeHistoryProviderProps {
  objectId: string;
  adapter: ChangeHistoryAdapter;
  renderPreview: ChangeHistoryPreviewRenderFn;
  renderBadge?: ChangeHistoryBadgeRenderFn;
  labels?: ChangeHistoryLabels;
  children: React.ReactNode;
}

export const ChangeHistoryProvider = ({
  objectId,
  adapter,
  renderPreview,
  renderBadge,
  labels,
  children,
}: ChangeHistoryProviderProps): JSX.Element => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChangeId, setSelectedChangeId] = useState<string | undefined>();

  useEffect(() => {
    setSelectedChangeId(undefined);
  }, [objectId]);

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

  const value = useMemo(
    () => ({
      objectId,
      adapter,
      renderPreview,
      renderBadge,
      labels: {
        modalTitle: labels?.modalTitle ?? i18n.MODAL_TITLE,
      },
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
      objectId,
      openModal,
      renderBadge,
      renderPreview,
      selectedChangeId,
    ]
  );

  return <ChangeHistoryContext.Provider value={value}>{children}</ChangeHistoryContext.Provider>;
};
