/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiToolTip,
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
} from '@elastic/eui';

import * as i18n from '../translations';

export interface CloseReasonOption {
  key?: string;
}

export interface CloseCaseModalProps {
  /** The alerts disclaimer; off when the case closes no alerts (agentic cases keep the reason anyway). */
  showAlertsDisclaimer?: boolean;
  /** Overrides the title and search placeholder that speak of detections. */
  title?: string;
  searchPlaceholder?: string;
  /** Rendered under the reasons: the verdict line and plugin sections (agentic cases). */
  children?: React.ReactNode;
  /** Rendered above the reasons: what must happen before the case can close. */
  header?: React.ReactNode;
  /** When set, Close case is disabled and this says what is missing. */
  confirmDisabledReason?: string;
  closeReasonOptions: Array<EuiSelectableOption<CloseReasonOption>>;
  onClose: () => void;
  onSubmit: () => void;
  onCloseReasonOptionsChange: (
    options: Array<EuiSelectableOption<CloseReasonOption>>,
    event?: unknown,
    changedOption?: EuiSelectableOption<CloseReasonOption>
  ) => void;
}

export const CloseCaseModal = React.memo<CloseCaseModalProps>(
  ({
    closeReasonOptions,
    onClose,
    onSubmit,
    onCloseReasonOptionsChange,
    showAlertsDisclaimer = true,
    title = i18n.CLOSE_CASE_MODAL_TITLE,
    searchPlaceholder = i18n.CLOSE_CASE_MODAL_REASON_SEARCH_PLACEHOLDER,
    children,
    header,
    confirmDisabledReason,
  }) => (
    <EuiModal onClose={onClose} aria-label={title} data-test-subj="close-case-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {header}
        {showAlertsDisclaimer ? (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.CLOSE_CASE_MODAL_DISCLAIMER}
              iconType="info"
              size="s"
            />
            <EuiSpacer size="s" />
          </>
        ) : null}
        <EuiSelectable
          aria-label={i18n.CLOSE_CASE_MODAL_REASON_LABEL}
          options={closeReasonOptions}
          onChange={onCloseReasonOptionsChange}
          singleSelection="always"
          height={240}
          searchable
          searchProps={{ placeholder: searchPlaceholder }}
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
        {children}
      </EuiModalBody>
      <EuiModalFooter
        css={{
          justifyContent: 'space-between',
        }}
      >
        <EuiButtonEmpty onClick={onClose}>{i18n.CLOSE_CASE_MODAL_CLOSE_BUTTON}</EuiButtonEmpty>
        <EuiToolTip content={confirmDisabledReason}>
          <EuiButton
            onClick={onSubmit}
            fill
            isDisabled={confirmDisabledReason != null}
            data-test-subj="close-case-modal-confirm"
          >
            {i18n.CLOSE_CASE_MODAL_CONFIRM}
          </EuiButton>
        </EuiToolTip>
      </EuiModalFooter>
    </EuiModal>
  )
);

CloseCaseModal.displayName = 'CloseCaseModal';
