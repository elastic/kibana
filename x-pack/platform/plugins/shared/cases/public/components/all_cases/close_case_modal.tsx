/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelectable,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

import * as i18n from './translations';

const CUSTOM_ALERT_CLOSE_REASONS_SETTING_KEY = 'securitySolution:alertCloseReasons';

interface ClosingReasonOption {
  key?: string;
}

type CloseCaseModalStep = 'sync_decision' | 'reason_selection';

const getDefaultClosingReasonOptions = (): Array<EuiSelectableOption<ClosingReasonOption>> => [
  { label: i18n.CLOSE_CASE_MODAL_REASON_CLOSE_WITHOUT_REASON, key: undefined },
  { label: i18n.CLOSE_CASE_MODAL_REASON_DUPLICATE, key: 'duplicate' },
  { label: i18n.CLOSE_CASE_MODAL_REASON_FALSE_POSITIVE, key: 'false_positive' },
  { label: i18n.CLOSE_CASE_MODAL_REASON_TRUE_POSITIVE, key: 'true_positive' },
  { label: i18n.CLOSE_CASE_MODAL_REASON_BENIGN_POSITIVE, key: 'benign_positive' },
  { label: i18n.CLOSE_CASE_MODAL_REASON_OTHER, key: 'other' },
];

interface CloseCaseModalProps {
  isSyncDecisionStep: boolean;
  closeReasonOptions: Array<EuiSelectableOption<ClosingReasonOption>>;
  selectedClosingReason?: EuiSelectableOption<ClosingReasonOption>;
  onClose: () => void;
  onCloseCaseOnly: () => void;
  onGoToCloseReasonSelection: () => void;
  onCloseCaseAndSyncAlerts: () => void;
  onCloseReasonOptionsChange: (
    options: Array<EuiSelectableOption<ClosingReasonOption>>,
    event?: unknown,
    changedOption?: EuiSelectableOption<ClosingReasonOption>
  ) => void;
}

const CloseCaseModalComponent = React.memo<CloseCaseModalProps>(
  ({
    isSyncDecisionStep,
    closeReasonOptions,
    selectedClosingReason,
    onClose,
    onCloseCaseOnly,
    onGoToCloseReasonSelection,
    onCloseCaseAndSyncAlerts,
    onCloseReasonOptionsChange,
  }) => (
    <EuiModal onClose={onClose} aria-label={i18n.CLOSE_CASE_MODAL_TITLE}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.CLOSE_CASE_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {isSyncDecisionStep ? (
          <EuiText size="s">
            <p>{i18n.CLOSE_CASE_MODAL_SYNC_DECISION_DESCRIPTION}</p>
          </EuiText>
        ) : (
          <EuiSelectable
            aria-label={i18n.CLOSE_CASE_MODAL_REASON_LABEL}
            options={closeReasonOptions}
            onChange={onCloseReasonOptionsChange}
            singleSelection="always"
            height={closeReasonOptions.length * 32}
          >
            {(list) => list}
          </EuiSelectable>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        {isSyncDecisionStep ? (
          <>
            <EuiButton onClick={onCloseCaseOnly}>
              {i18n.CLOSE_CASE_MODAL_DO_NOT_SYNC_CLOSE_REASON}
            </EuiButton>
            <EuiButton onClick={onGoToCloseReasonSelection} fill>
              {i18n.CLOSE_CASE_MODAL_SYNC_CLOSE_REASON}
            </EuiButton>
          </>
        ) : (
          <EuiButton onClick={onCloseCaseAndSyncAlerts} fill disabled={!selectedClosingReason}>
            {i18n.CLOSE_CASE_MODAL_CONFIRM}
          </EuiButton>
        )}
      </EuiModalFooter>
    </EuiModal>
  )
);

CloseCaseModalComponent.displayName = 'CloseCaseModalComponent';

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
    const customClosingReasons =
      uiSettings.get<string[]>(CUSTOM_ALERT_CLOSE_REASONS_SETTING_KEY) ?? [];

    return [
      ...getDefaultClosingReasonOptions(),
      ...customClosingReasons.map((reason) => ({ label: reason, key: reason })),
    ];
  }, [uiSettings]);

  const createCloseReasonOptions = useCallback(
    () =>
      initialCloseReasonOptions.map((closeReasonOption) => ({
        ...closeReasonOption,
        checked: undefined,
      })),
    [initialCloseReasonOptions]
  );
  const [isCloseCaseModalVisible, setIsCloseCaseModalVisible] = useState(false);
  const [closeCaseModalStep, setCloseCaseModalStep] = useState<CloseCaseModalStep>('sync_decision');
  const [closeReasonOptions, setCloseReasonOptions] = useState<
    Array<EuiSelectableOption<ClosingReasonOption>>
  >(() => createCloseReasonOptions());
  const [selectedClosingReason, setSelectedClosingReason] =
    useState<EuiSelectableOption<ClosingReasonOption>>();
  const onCloseReasonOptionsChange = useCallback(
    (
      options: Array<EuiSelectableOption<ClosingReasonOption>>,
      _event?: unknown,
      changedOption?: EuiSelectableOption<ClosingReasonOption>
    ) => {
      setCloseReasonOptions(options);
      setSelectedClosingReason(changedOption?.checked === 'on' ? changedOption : undefined);
    },
    []
  );

  const closeCloseCaseModal = useCallback(() => {
    setIsCloseCaseModalVisible(false);
  }, []);

  const onCloseCaseOnly = useCallback(() => {
    closeCloseCaseModal();
    onCloseCase();
  }, [closeCloseCaseModal, onCloseCase]);

  const onCloseCaseAndSyncAlerts = useCallback(() => {
    closeCloseCaseModal();
    onCloseCase(selectedClosingReason?.key);
  }, [closeCloseCaseModal, onCloseCase, selectedClosingReason?.key]);

  const onGoToCloseReasonSelection = useCallback(() => {
    setCloseCaseModalStep('reason_selection');
  }, []);

  const openCloseCaseModal = useCallback(() => {
    // Should automatically close without reason when case sync to alerts is disabled
    if (!canSyncCloseReasonToAlerts) {
      onCloseCase();
      return;
    }
    setCloseReasonOptions(createCloseReasonOptions());
    setSelectedClosingReason(undefined);
    setCloseCaseModalStep('sync_decision');
    setIsCloseCaseModalVisible(true);
  }, [canSyncCloseReasonToAlerts, createCloseReasonOptions, onCloseCase]);

  return {
    openCloseCaseModal,
    closeCaseModal: isCloseCaseModalVisible ? (
      <CloseCaseModalComponent
        isSyncDecisionStep={closeCaseModalStep === 'sync_decision'}
        closeReasonOptions={closeReasonOptions}
        selectedClosingReason={selectedClosingReason}
        onClose={closeCloseCaseModal}
        onCloseCaseOnly={onCloseCaseOnly}
        onGoToCloseReasonSelection={onGoToCloseReasonSelection}
        onCloseCaseAndSyncAlerts={onCloseCaseAndSyncAlerts}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
      />
    ) : null,
  };
};
