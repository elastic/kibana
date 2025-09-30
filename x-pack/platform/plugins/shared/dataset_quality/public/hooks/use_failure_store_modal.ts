/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FailureStoreModal } from '@kbn/failure-store-modal';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';

export function useFailureStoreModal() {
  const {
    canUserReadFailureStore,
    hasFailureStore,
    defaultRetentionPeriod,
    customRetentionPeriod,
    updateFailureStore,
    canUserManageFailureStore,
  } = useDatasetQualityDetailsState();

  const [isFailureStoreModalOpen, setIsFailureStoreModalOpen] = useState(false);

  const openModal = () => {
    setIsFailureStoreModalOpen(true);
  };

  const closeModal = () => {
    setIsFailureStoreModalOpen(false);
  };

  const handleSaveModal = async (data: {
    failureStoreEnabled: boolean;
    customRetentionPeriod?: string;
  }) => {
    updateFailureStore({
      failureStoreEnabled: data.failureStoreEnabled,
      customRetentionPeriod: data.customRetentionPeriod,
    });
    closeModal();
  };

  const renderModal = (): React.ReactElement | null => {
    if (canUserManageFailureStore && isFailureStoreModalOpen) {
      return React.createElement(FailureStoreModal, {
        onCloseModal: closeModal,
        onSaveModal: handleSaveModal,
        failureStoreProps: {
          failureStoreEnabled: hasFailureStore,
          defaultRetentionPeriod,
          customRetentionPeriod,
        },
      });
    }
    return null;
  };

  return {
    isFailureStoreModalOpen,
    openModal,
    closeModal,
    handleSaveModal,
    canUserReadFailureStore,
    canUserManageFailureStore,
    hasFailureStore,
    defaultRetentionPeriod,
    customRetentionPeriod,
    renderModal,
  };
}
