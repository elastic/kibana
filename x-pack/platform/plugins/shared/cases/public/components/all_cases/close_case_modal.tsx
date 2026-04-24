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

import * as i18n from './translations';

export interface CloseReasonOption {
  key?: string;
}

export interface CloseCaseModalProps {
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
  ({ closeReasonOptions, onClose, onSubmit, onCloseReasonOptionsChange }) => (
    <EuiModal onClose={onClose} aria-label={i18n.CLOSE_CASE_MODAL_TITLE}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.CLOSE_CASE_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut title={i18n.CLOSE_CASE_MODAL_DISCLAIMER} iconType="info" size="s" />
        <EuiSpacer size="s" />
        <EuiSelectable
          aria-label={i18n.CLOSE_CASE_MODAL_REASON_LABEL}
          options={closeReasonOptions}
          onChange={onCloseReasonOptionsChange}
          singleSelection="always"
          height={240}
          searchable
          searchProps={{ placeholder: i18n.CLOSE_CASE_MODAL_REASON_SEARCH_PLACEHOLDER }}
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
        css={{
          'justify-content': 'space-between',
        }}
      >
        <EuiButtonEmpty onClick={onClose}>{i18n.CLOSE_CASE_MODAL_CLOSE_BUTTON}</EuiButtonEmpty>
        <EuiButton onClick={onSubmit} fill>
          {i18n.CLOSE_CASE_MODAL_CONFIRM}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  )
);

CloseCaseModal.displayName = 'CloseCaseModal';
