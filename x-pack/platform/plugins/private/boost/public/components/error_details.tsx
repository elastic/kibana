/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { CoreStart, Toast } from '@kbn/core/public';
import {
  EuiCodeBlock,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { ModalFooterActions } from './confirm_modal';
import { MODAL_WIDTH } from './modal_width';

export type ErrorDetailsServices = Pick<
  CoreStart,
  'notifications' | 'overlays' | 'rendering' | 'uiSettings'
>;

const VIEW_DETAILS_LABEL = i18n.translate('xpack.boost.errorDetails.viewDetails', {
  defaultMessage: 'View details',
});

interface ErrorDetailsModalProps {
  title: string;
  /** The title's ID, which labels the modal. */
  titleId: string;
  children: ReactNode;
  onClose: () => void;
  onRetry: () => void;
}

// The modal's content: core's modal service draws the modal around it.
const ErrorDetailsModal = ({
  title,
  titleId,
  children,
  onClose,
  onRetry,
}: ErrorDetailsModalProps) => (
  <div css={{ inlineSize: MODAL_WIDTH, maxInlineSize: '100%' }}>
    <EuiModalHeader>
      <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
    </EuiModalHeader>
    <EuiModalBody>{children}</EuiModalBody>
    <ModalFooterActions
      cancelButtonText={i18n.translate('xpack.boost.errorDetails.close', {
        defaultMessage: 'Close',
      })}
      confirmButtonText={i18n.translate('xpack.boost.errorDetails.tryAgain', {
        defaultMessage: 'Try again',
      })}
      onCancel={onClose}
      onConfirm={onRetry}
      cancelTestSubj="boostErrorDetailsClose"
      confirmTestSubj="boostErrorDetailsTryAgain"
    />
  </div>
);

interface ErrorToastInput {
  title: string;
  /** What happened, when the title alone doesn't say. */
  text?: string;
  /** The details modal's body: what couldn't be done, and why. */
  details: ReactNode;
  /** Tries again, from the details modal, which closes along with the toast. */
  onRetry: () => void;
}

/**
 * Shows a danger toast whose "View details" action opens a modal of what went wrong, with a button
 * to try again. Like core's error toasts, it stays up as long as they do, and its action is EUI's
 * toast action.
 */
export const showErrorToast = (
  { notifications: { toasts }, overlays, rendering, uiSettings }: ErrorDetailsServices,
  { title, text, details, onRetry }: ErrorToastInput
): Toast => {
  const openDetails = () => {
    const titleId = htmlIdGenerator('boostErrorDetailsTitle')();
    const modal = overlays.openModal(
      toMountPoint(
        <ErrorDetailsModal
          title={title}
          titleId={titleId}
          onClose={() => modal.close()}
          onRetry={() => {
            modal.close();
            toasts.remove(toast);
            onRetry();
          }}
        >
          {details}
        </ErrorDetailsModal>,
        rendering
      ),
      {
        maxWidth: MODAL_WIDTH,
        'aria-labelledby': titleId,
        'data-test-subj': 'boostErrorDetailsModal',
      }
    );
  };
  const toast = toasts.addDanger(
    {
      title,
      text,
      actionProps: {
        primary: {
          children: VIEW_DETAILS_LABEL,
          onClick: openDetails,
          'data-test-subj': 'boostErrorViewDetails',
        },
      },
    },
    { toastLifeTimeMs: uiSettings.get('notifications:lifetime:error') }
  );
  return toast;
};

interface RequestErrorDetailsProps {
  /** What couldn't be done, and that it can be tried again. */
  description: string;
  details: string;
}

/** A failed request's details: what couldn't be done, then what the server said. */
export const RequestErrorDetails = ({ description, details }: RequestErrorDetailsProps) => (
  <>
    <EuiText size="s">
      <p>{description}</p>
    </EuiText>
    <EuiSpacer size="m" />
    <EuiCodeBlock isCopyable paddingSize="s" data-test-subj="boostErrorDetailsCode">
      {details}
    </EuiCodeBlock>
  </>
);
