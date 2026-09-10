/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FailureStoreModal } from '@kbn/failure-store-modal';
import type { FailureStore } from '@kbn/streams-schema';
import {
  isRootStreamDefinition,
  isEnabledFailureStore,
  isInheritFailureStore,
  isDisabledLifecycleFailureStore,
  isEnabledLifecycleFailureStore,
} from '@kbn/streams-schema';
import type { FailureStoreFormData } from '@kbn/failure-store-modal';
import { i18n } from '@kbn/i18n';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';

export function useFailureStoreModal() {
  const {
    canUserReadFailureStore,
    hasFailureStore,
    defaultRetentionPeriod,
    customRetentionPeriod,
    updateFailureStore,
    canUserManageFailureStore,
    streamDefinition,
    view,
    dataStreamDetails,
  } = useDatasetQualityDetailsState();

  const [isFailureStoreModalOpen, setIsFailureStoreModalOpen] = useState(false);

  const openModal = () => {
    setIsFailureStoreModalOpen(true);
  };

  const closeModal = () => {
    setIsFailureStoreModalOpen(false);
  };

  const getFailureStoreConfigForStreamView = (data: FailureStoreFormData): FailureStore => {
    if ('inherit' in data && data.inherit) {
      return { inherit: {} };
    } else if (!data.failureStoreEnabled) {
      return { disabled: {} };
    } else if ('retentionDisabled' in data && data.retentionDisabled) {
      return {
        lifecycle: { disabled: {} },
      };
    } else {
      return {
        lifecycle: {
          enabled: {
            data_retention:
              'customRetentionPeriod' in data ? data.customRetentionPeriod : undefined,
          },
        },
      };
    }
  };

  const renderModalForStreamView = () => {
    if (!streamDefinition) {
      return null;
    }

    const isWired = view === 'wired';
    const canShowInherit = !isRootStreamDefinition(streamDefinition.stream);

    const failureStore = streamDefinition.stream.ingest.failure_store;

    const isCurrentlyInherited = isInheritFailureStore(failureStore);

    const effectiveFailureStoreEnabled = isEnabledFailureStore(failureStore);

    const retentionDisabled = isDisabledLifecycleFailureStore(failureStore);

    const effectiveCustomRetentionPeriod = isEnabledLifecycleFailureStore(failureStore)
      ? failureStore.lifecycle.enabled.data_retention
      : undefined;

    const isServerless = dataStreamDetails?.isServerless ?? false;

    return React.createElement(FailureStoreModal, {
      onCloseModal: closeModal,
      onSaveModal: handleSaveModal,
      failureStoreProps: {
        failureStoreEnabled: effectiveFailureStoreEnabled,
        defaultRetentionPeriod,
        customRetentionPeriod: effectiveCustomRetentionPeriod,
        retentionDisabled,
      },
      ...(canShowInherit && {
        inheritOptions: {
          canShowInherit,
          isWired,
          isCurrentlyInherited,
        },
      }),
      showIlmDescription: !isServerless,
      canShowDisableLifecycle: !isServerless,
      disableButtonLabel: i18n.translate(
        'xpack.datasetQuality.failureStoreModal.indefiniteButtonLabel',
        {
          defaultMessage: 'Indefinite',
        }
      ),
    });
  };

  const handleSaveModal = async (data: FailureStoreFormData) => {
    const newFailureStoreConfig =
      view === 'dataQuality'
        ? {
            failureStoreDataQualityConfig: {
              failureStoreEnabled: data.failureStoreEnabled ?? false,
              customRetentionPeriod:
                'customRetentionPeriod' in data ? data.customRetentionPeriod : undefined,
            },
          }
        : { failureStoreStreamConfig: getFailureStoreConfigForStreamView(data) };

    updateFailureStore(newFailureStoreConfig);

    closeModal();
  };

  const renderModal = (): React.ReactElement | null => {
    if (!canUserManageFailureStore || !isFailureStoreModalOpen) {
      return null;
    }

    if (view === 'dataQuality') {
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
    // For stream views (classic/wired)
    return renderModalForStreamView();
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
