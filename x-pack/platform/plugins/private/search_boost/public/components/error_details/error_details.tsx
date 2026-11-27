/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { ModalTableColumn } from '../modals/modal_table';
import { ModalTable } from '../modals/modal_table';
import { ModalFooterActions } from '../modals/confirm_modal';
import {
  CLOSE_LABEL,
  ERROR_DETAILS_COLUMNS,
  ERROR_DETAILS_TABLE_LABEL,
  ERROR_DETAILS_TITLE,
  TRY_AGAIN_LABEL,
} from '../../translations';

export interface ErrorDetailsFailure {
  /** What the item is, such as the rule's name. Left out when only one thing failed. */
  name?: string;
  /** The response's status, such as "409 Conflict", unless there was no response. */
  status?: string;
  reason: string;
}

export interface ErrorDetailsProps {
  description: string;
  nameColumn?: string;
  failures: readonly ErrorDetailsFailure[];
}

const EMPTY_VALUE = '—';

const getFailureId = ({ name, status, reason }: ErrorDetailsFailure) =>
  name ?? `${status ?? ''}${reason}`;

export const ErrorDetails = ({ description, nameColumn, failures }: ErrorDetailsProps) => {
  const columns: Array<ModalTableColumn<ErrorDetailsFailure>> = [
    ...(nameColumn
      ? [{ id: 'name', name: nameColumn, render: ({ name }: ErrorDetailsFailure) => name }]
      : []),
    {
      id: 'status',
      name: ERROR_DETAILS_COLUMNS.error,
      render: ({ status }) => status ?? EMPTY_VALUE,
    },
    { id: 'reason', name: ERROR_DETAILS_COLUMNS.reason, render: ({ reason }) => reason },
  ];

  return (
    <>
      <EuiText size="s" component="p" data-test-subj="searchBoostErrorDetailsDescription">
        {description}
      </EuiText>
      <EuiSpacer size="l" />
      <ModalTable
        aria-label={ERROR_DETAILS_TABLE_LABEL}
        columns={columns}
        items={failures}
        getRowId={getFailureId}
        data-test-subj="searchBoostErrorDetailsTable"
      />
    </>
  );
};

export interface ErrorDetailsModalContentProps extends ErrorDetailsProps {
  titleId: string;
  onClose: () => void;
  /** Shows "Try again", for an action that can be retried. */
  onRetry?: () => void;
}

/** Only the content: the modal service draws the modal around it. */
export const ErrorDetailsModalContent = ({
  titleId,
  onClose,
  onRetry,
  ...detailsProps
}: ErrorDetailsModalContentProps) => (
  <>
    <EuiModalHeader>
      <EuiModalHeaderTitle id={titleId}>{ERROR_DETAILS_TITLE}</EuiModalHeaderTitle>
    </EuiModalHeader>
    <EuiModalBody>
      <ErrorDetails {...detailsProps} />
    </EuiModalBody>
    {onRetry ? (
      <ModalFooterActions
        cancelButtonText={CLOSE_LABEL}
        confirmButtonText={TRY_AGAIN_LABEL}
        onCancel={onClose}
        onConfirm={onRetry}
        cancelTestSubj="searchBoostErrorDetailsClose"
        confirmTestSubj="searchBoostErrorDetailsTryAgain"
      />
    ) : (
      <EuiModalFooter>
        <EuiButton size="s" fill onClick={onClose} data-test-subj="searchBoostErrorDetailsClose">
          {CLOSE_LABEL}
        </EuiButton>
      </EuiModalFooter>
    )}
  </>
);
