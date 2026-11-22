/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

export interface BulkDialogProps {
  title: string;
  confirmLabel: string;
  isConfirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  width?: string;
  'data-test-subj': string;
  children: React.ReactNode;
}

/** The frame the bulk action dialogs share: a title, the inputs, Cancel and a confirm button. */
export const BulkDialog: React.FC<BulkDialogProps> = ({
  title,
  confirmLabel,
  isConfirmDisabled = false,
  onConfirm,
  onClose,
  width = '520px',
  'data-test-subj': dataTestSubj,
  children,
}) => {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      css={css`
        width: min(${width}, 100%);
      `}
      data-test-subj={dataTestSubj}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{children}</EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj={`${dataTestSubj}Cancel`}>
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onConfirm}
              isDisabled={isConfirmDisabled}
              data-test-subj={`${dataTestSubj}Confirm`}
            >
              {confirmLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
BulkDialog.displayName = 'BulkDialog';
