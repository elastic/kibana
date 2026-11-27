/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
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
  EuiSkeletonText,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import {
  AFFECTED_CONTENT_LABEL,
  CANCEL_BUTTON_LABEL,
  LOAD_AFFECTED_ERROR_TITLE,
  TRY_AGAIN_LABEL,
} from '../../translations';

export const AFFECTED_MODAL_WIDTH = 720;

export interface AffectedLoadState {
  isLoading?: boolean;
  loadError?: Error;
  onRetryLoad?: () => void;
}

interface ModalFooterActionsProps {
  cancelButtonText: string;
  confirmButtonText: string;
  onCancel: () => void;
  onConfirm: () => void;
  buttonColor?: 'primary' | 'danger';
  isConfirming?: boolean;
  isConfirmDisabled?: boolean;
  isCancelDisabled?: boolean;
  secondaryAction?: ReactNode;
  cancelTestSubj?: string;
  confirmTestSubj?: string;
}

export const ModalFooterActions = ({
  cancelButtonText,
  confirmButtonText,
  onCancel,
  onConfirm,
  buttonColor = 'primary',
  isConfirming = false,
  isConfirmDisabled = false,
  isCancelDisabled = false,
  secondaryAction,
  cancelTestSubj = 'searchBoostModalCancel',
  confirmTestSubj = 'searchBoostModalConfirm',
}: ModalFooterActionsProps) => (
  <EuiModalFooter>
    <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          flush="left"
          onClick={onCancel}
          isDisabled={isCancelDisabled}
          data-test-subj={cancelTestSubj}
        >
          {cancelButtonText}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          {secondaryAction && <EuiFlexItem grow={false}>{secondaryAction}</EuiFlexItem>}
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              color={buttonColor}
              onClick={onConfirm}
              isLoading={isConfirming}
              isDisabled={isConfirmDisabled}
              data-test-subj={confirmTestSubj}
            >
              {confirmButtonText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiModalFooter>
);

export interface ConfirmModalProps extends AffectedLoadState {
  title: string;
  description?: string;
  children?: ReactNode;
  confirmButtonText: string;
  cancelButtonText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Closes the modal with Escape or the close button; `onCancel` unless set. */
  onClose?: () => void;
  buttonColor?: 'primary' | 'danger';
  isConfirming?: boolean;
  secondaryAction?: ReactNode;
  'data-test-subj': string;
}

interface LoadErrorProps {
  loadError: Error;
  onRetryLoad?: () => void;
}

const LoadError = ({ loadError, onRetryLoad }: LoadErrorProps) => (
  <KbnDangerCallout
    size="s"
    title={LOAD_AFFECTED_ERROR_TITLE}
    text={<p>{loadError.message}</p>}
    actionProps={
      onRetryLoad && {
        primary: {
          children: TRY_AGAIN_LABEL,
          onClick: onRetryLoad,
          'data-test-subj': 'searchBoostModalRetryLoad',
        },
      }
    }
    data-test-subj="searchBoostModalLoadError"
  />
);

export const ConfirmModal = ({
  title,
  description,
  children,
  confirmButtonText,
  cancelButtonText = CANCEL_BUTTON_LABEL,
  onCancel,
  onConfirm,
  onClose = onCancel,
  buttonColor = 'primary',
  isConfirming = false,
  isLoading = false,
  loadError,
  onRetryLoad,
  secondaryAction,
  'data-test-subj': dataTestSubj,
}: ConfirmModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'searchBoostConfirmModalTitle' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'searchBoostConfirmModalDescription' });
  const showsDescription = description !== undefined && !isLoading && !loadError;
  // The action keeps running once confirmed, so the modal stays open until it ends.
  const closeUnlessConfirming = () => {
    if (!isConfirming) onClose();
  };

  return (
    <EuiModal
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={showsDescription ? descriptionId : undefined}
      onClose={closeUnlessConfirming}
      maxWidth={AFFECTED_MODAL_WIDTH}
      css={css`
        inline-size: ${AFFECTED_MODAL_WIDTH}px;
      `}
      data-test-subj={dataTestSubj}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {!isLoading && loadError ? (
          <LoadError loadError={loadError} onRetryLoad={onRetryLoad} />
        ) : (
          <EuiSkeletonText
            lines={4}
            isLoading={isLoading}
            contentAriaLabel={AFFECTED_CONTENT_LABEL}
            data-test-subj="searchBoostModalLoading"
          >
            {description !== undefined && (
              <EuiText
                size="s"
                component="p"
                id={descriptionId}
                data-test-subj={`${dataTestSubj}Body`}
              >
                {description}
              </EuiText>
            )}
            {children}
          </EuiSkeletonText>
        )}
      </EuiModalBody>
      <ModalFooterActions
        cancelButtonText={cancelButtonText}
        confirmButtonText={confirmButtonText}
        onCancel={onCancel}
        onConfirm={onConfirm}
        buttonColor={buttonColor}
        isConfirming={isConfirming}
        isConfirmDisabled={isLoading || Boolean(loadError)}
        isCancelDisabled={isConfirming}
        secondaryAction={secondaryAction}
      />
    </EuiModal>
  );
};
