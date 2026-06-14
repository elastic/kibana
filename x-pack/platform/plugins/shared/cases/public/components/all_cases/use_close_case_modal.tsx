/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import {
  DEFAULT_CLOSING_REASON_OPTIONS,
  DEFAULT_DETECTIONS_CLOSE_REASONS_KEY,
} from '@kbn/response-ops-detections-close-reason';

import { CloseCaseModal } from './close_case_modal';
import type { CloseReasonOption } from './close_case_modal';

interface UseCloseCaseModalProps {
  canSyncCloseReasonToAlerts: boolean;
  onCloseCase: (closeReason?: string) => void;
}

interface UseCloseCaseModalReturnValue {
  openCloseCaseModal: () => void;
  closeCaseModal: JSX.Element | null;
}

export const useCloseCaseModal = ({
  canSyncCloseReasonToAlerts,
  onCloseCase,
}: UseCloseCaseModalProps): UseCloseCaseModalReturnValue => {
  const {
    services: { uiSettings },
  } = useKibana<{ uiSettings: IUiSettingsClient }>();

  const initialCloseReasonOptions = useMemo(() => {
    const customCloseReasons = uiSettings.get<string[]>(DEFAULT_DETECTIONS_CLOSE_REASONS_KEY, []);

    return [
      ...DEFAULT_CLOSING_REASON_OPTIONS,
      ...customCloseReasons.map((reason) => ({ label: reason, key: reason })),
    ];
  }, [uiSettings]);

  const createCloseReasonOptions = useCallback(
    () =>
      initialCloseReasonOptions.map((closeReasonOption) => ({
        ...closeReasonOption,
        checked: closeReasonOption.key == null ? ('on' as const) : undefined,
      })),
    [initialCloseReasonOptions]
  );
  const [isCloseCaseModalVisible, setIsCloseCaseModalVisible] = useState(false);
  const [closeReasonOptions, setCloseReasonOptions] = useState<
    Array<EuiSelectableOption<CloseReasonOption>>
  >(() => createCloseReasonOptions());
  const selectedCloseReason = useMemo(
    () => closeReasonOptions.find((option) => option.checked === 'on'),
    [closeReasonOptions]
  );
  const onCloseReasonOptionsChange = useCallback(
    (
      options: Array<EuiSelectableOption<CloseReasonOption>>,
      _event?: unknown,
      _changedOption?: EuiSelectableOption<CloseReasonOption>
    ) => {
      setCloseReasonOptions(options);
    },
    []
  );

  const closeCloseCaseModal = useCallback(() => {
    setIsCloseCaseModalVisible(false);
  }, []);

  const onSubmit = useCallback(() => {
    closeCloseCaseModal();
    onCloseCase(selectedCloseReason?.key);
  }, [closeCloseCaseModal, onCloseCase, selectedCloseReason?.key]);

  const openCloseCaseModal = useCallback(() => {
    if (canSyncCloseReasonToAlerts) {
      const nextCloseReasonOptions = createCloseReasonOptions();
      setCloseReasonOptions(nextCloseReasonOptions);
      setIsCloseCaseModalVisible(true);
    } else {
      // Should automatically close without reason when case sync to alerts is disabled
      onCloseCase();
    }
  }, [canSyncCloseReasonToAlerts, createCloseReasonOptions, onCloseCase]);

  return {
    openCloseCaseModal,
    closeCaseModal: isCloseCaseModalVisible ? (
      <CloseCaseModal
        closeReasonOptions={closeReasonOptions}
        onClose={closeCloseCaseModal}
        onSubmit={onSubmit}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
      />
    ) : null,
  };
};
