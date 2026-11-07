/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
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

interface ModalFooterActionsProps {
  cancelButtonText: string;
  confirmButtonText: string;
  onCancel: () => void;
  onConfirm: () => void;
  buttonColor?: 'primary' | 'danger';
  isLoading?: boolean;
  cancelTestSubj?: string;
  confirmTestSubj?: string;
}

/**
 * The footer every boost modal shares: small buttons, with the one that leaves, flush, at the start,
 * and the one that acts at the end.
 */
export const ModalFooterActions = ({
  cancelButtonText,
  confirmButtonText,
  onCancel,
  onConfirm,
  buttonColor = 'primary',
  isLoading = false,
  cancelTestSubj = 'confirmModalCancelButton',
  confirmTestSubj = 'confirmModalConfirmButton',
}: ModalFooterActionsProps) => (
  <EuiModalFooter>
    <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty size="s" flush="left" onClick={onCancel} data-test-subj={cancelTestSubj}>
          {cancelButtonText}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          fill
          color={buttonColor}
          onClick={onConfirm}
          isLoading={isLoading}
          data-test-subj={confirmTestSubj}
        >
          {confirmButtonText}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiModalFooter>
);

interface ConfirmModalProps {
  title: string;
  children: ReactNode;
  cancelButtonText: string;
  confirmButtonText: string;
  onCancel: () => void;
  onConfirm: () => void;
  buttonColor?: 'primary' | 'danger';
  isLoading?: boolean;
  /** A fixed width, for a modal that lists what a change affects. */
  width?: number;
  'data-test-subj'?: string;
}

/**
 * Asks to confirm an action, like `EuiConfirmModal`, with the footer every boost modal shares: small
 * buttons, with Cancel at the start.
 */
export const ConfirmModal = ({
  title,
  children,
  cancelButtonText,
  confirmButtonText,
  onCancel,
  onConfirm,
  buttonColor = 'primary',
  isLoading = false,
  width,
  'data-test-subj': dataTestSubj,
}: ConfirmModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'boostConfirmModalTitle' });

  return (
    <EuiModal
      role="alertdialog"
      aria-labelledby={titleId}
      onClose={onCancel}
      maxWidth={width ?? true}
      css={width ? { inlineSize: width } : undefined}
      data-test-subj={dataTestSubj}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{children}</EuiModalBody>
      <ModalFooterActions
        cancelButtonText={cancelButtonText}
        confirmButtonText={confirmButtonText}
        onCancel={onCancel}
        onConfirm={onConfirm}
        buttonColor={buttonColor}
        isLoading={isLoading}
      />
    </EuiModal>
  );
};
