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
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSelectable,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

import * as i18n from './translations';

const CUSTOM_ALERT_CLOSE_REASONS_SETTING_KEY = 'securitySolution:alertCloseReasons';

interface ClosingReasonOption {
  key?: string;
}

const getDefaultClosingReasonOptions = (): Array<EuiSelectableOption<ClosingReasonOption>> => [
  { label: i18n.CLOSE_CASE_MODAL_REASON_CLOSE_WITHOUT_REASON, key: undefined },
  { label: i18n.CLOSE_CASE_MODAL_REASON_DUPLICATE, key: 'duplicate' },
  { label: i18n.CLOSE_CASE_MODAL_REASON_FALSE_POSITIVE, key: 'false_positive' },
  { label: i18n.CLOSE_CASE_MODAL_REASON_TRUE_POSITIVE, key: 'true_positive' },
  { label: i18n.CLOSE_CASE_MODAL_REASON_BENIGN_POSITIVE, key: 'benign_positive' },
  { label: i18n.CLOSE_CASE_MODAL_REASON_OTHER, key: 'other' },
];

interface CloseCaseModalProps {
  closeReasonOptions: Array<EuiSelectableOption<ClosingReasonOption>>;
  onClose: () => void;
  onSubmit: () => void;
  onCloseReasonOptionsChange: (
    options: Array<EuiSelectableOption<ClosingReasonOption>>,
    event?: unknown,
    changedOption?: EuiSelectableOption<ClosingReasonOption>
  ) => void;
}

const CloseCaseModalComponent = React.memo<CloseCaseModalProps>(
  ({ closeReasonOptions, onClose, onSubmit, onCloseReasonOptionsChange }) => (
    <EuiModal onClose={onClose} aria-label={i18n.CLOSE_CASE_MODAL_TITLE}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.CLOSE_CASE_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiSelectable
          aria-label={i18n.CLOSE_CASE_MODAL_REASON_LABEL}
          options={closeReasonOptions}
          onChange={onCloseReasonOptionsChange}
          singleSelection="always"
          height={240}
          searchable
        >
          {(list, search) => (
            <>
              {search}
              <EuiPanel
                hasBorder={false}
                hasShadow={false}
                paddingSize="s"
                css={{
                  height: '240px',
                }}
              >
                {list}
              </EuiPanel>
            </>
          )}
        </EuiSelectable>
      </EuiModalBody>
      <EuiModalFooter
        css={css`
          justify-content: space-between;
        `}
      >
        <EuiButtonEmpty onClick={onClose}>{i18n.CLOSE_CASE_MODAL_CLOSE_BUTTON}</EuiButtonEmpty>
        <EuiButton onClick={onSubmit} fill>
          {i18n.CLOSE_CASE_MODAL_CONFIRM}
        </EuiButton>
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
        checked: closeReasonOption.key == null ? ('on' as const) : undefined,
      })),
    [initialCloseReasonOptions]
  );
  const [isCloseCaseModalVisible, setIsCloseCaseModalVisible] = useState(false);
  const [closeReasonOptions, setCloseReasonOptions] = useState<
    Array<EuiSelectableOption<ClosingReasonOption>>
  >(() => createCloseReasonOptions());
  const [selectedClosingReason, setSelectedClosingReason] = useState<
    EuiSelectableOption<ClosingReasonOption> | undefined
  >(() => createCloseReasonOptions().find((option) => option.key == null));
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

  const onSubmit = useCallback(() => {
    closeCloseCaseModal();
    onCloseCase(selectedClosingReason?.key);
  }, [closeCloseCaseModal, onCloseCase, selectedClosingReason?.key]);

  const openCloseCaseModal = useCallback(() => {
    // Should automatically close without reason when case sync to alerts is disabled
    if (!canSyncCloseReasonToAlerts) {
      onCloseCase();
      return;
    }
    const nextCloseReasonOptions = createCloseReasonOptions();
    setCloseReasonOptions(nextCloseReasonOptions);
    setSelectedClosingReason(nextCloseReasonOptions.find((option) => option.key == null));
    setIsCloseCaseModalVisible(true);
  }, [canSyncCloseReasonToAlerts, createCloseReasonOptions, onCloseCase]);

  return {
    openCloseCaseModal,
    closeCaseModal: isCloseCaseModalVisible ? (
      <CloseCaseModalComponent
        closeReasonOptions={closeReasonOptions}
        onClose={closeCloseCaseModal}
        onSubmit={onSubmit}
        onCloseReasonOptionsChange={onCloseReasonOptionsChange}
      />
    ) : null,
  };
};
