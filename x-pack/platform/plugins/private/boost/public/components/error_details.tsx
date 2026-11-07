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
  EuiButton,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  htmlIdGenerator,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { RequestErrorDescription } from '../request_error';
import { describeRequestError } from '../request_error';
import { ChangeTable } from './change_table';
import { ModalFooterActions } from './confirm_modal';
import { MODAL_WIDTH } from './modal_width';

export type ErrorDetailsServices = Pick<
  CoreStart,
  'notifications' | 'overlays' | 'rendering' | 'uiSettings'
>;

const VIEW_DETAILS_LABEL = i18n.translate('xpack.boost.errorDetails.viewDetails', {
  defaultMessage: 'View details',
});

const CLOSE_LABEL = i18n.translate('xpack.boost.errorDetails.close', {
  defaultMessage: 'Close',
});

/** Heads the column of what failed requests were for, when there are several. */
export const ERROR_NAME_COLUMNS = {
  rule: i18n.translate('xpack.boost.errorDetails.ruleColumn', { defaultMessage: 'Boost rule' }),
} as const;

/** A failed request, and what it was for, such as the rule it couldn't delete. */
export interface RequestFailure extends RequestErrorDescription {
  name?: string;
}

interface ErrorDetailsProps {
  /** What couldn't be done, and whether it can be tried again. */
  description: string;
  /**
   * What the failures were for, such as "Boost rule", which heads a column of their names. Left out
   * for one failure, which the modal's title names.
   */
  nameColumn?: string;
  failures: readonly RequestFailure[];
}

/**
 * What went wrong: what couldn't be done, then each failed request's status and reason, in the
 * panel and table the delete modals list changes in.
 */
export const ErrorDetails = ({ description, nameColumn, failures }: ErrorDetailsProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiText size="s">
        <p>{description}</p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="none">
        <ChangeTable
          aria-label={i18n.translate('xpack.boost.errorDetails.tableLabel', {
            defaultMessage: 'What went wrong',
          })}
          columns={[
            ...(nameColumn ? [nameColumn] : []),
            i18n.translate('xpack.boost.errorDetails.errorColumn', { defaultMessage: 'Error' }),
            i18n.translate('xpack.boost.errorDetails.reasonColumn', { defaultMessage: 'Reason' }),
          ]}
          rows={failures.map(({ name, status, message }, index) => ({
            id: name ?? String(index),
            // Without a response, such as offline, there's no status, only the reason.
            cells: [...(nameColumn ? [name] : []), status ?? '—', message],
          }))}
          // Long lists scroll, keeping the modal's buttons in view.
          maxHeight={euiTheme.base * 15}
        />
      </EuiPanel>
    </>
  );
};

interface ErrorDetailsModalProps {
  title: string;
  /** The title's ID, which labels the modal. */
  titleId: string;
  children: ReactNode;
  onClose: () => void;
  onRetry?: () => void;
}

// The modal's content: core's modal service draws the modal around it. With something to try
// again, Close leaves from the start; otherwise, it's the one action, at the end.
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
    {onRetry ? (
      <ModalFooterActions
        cancelButtonText={CLOSE_LABEL}
        confirmButtonText={i18n.translate('xpack.boost.errorDetails.tryAgain', {
          defaultMessage: 'Try again',
        })}
        onCancel={onClose}
        onConfirm={onRetry}
        cancelTestSubj="boostErrorDetailsClose"
        confirmTestSubj="boostErrorDetailsTryAgain"
      />
    ) : (
      <EuiModalFooter>
        <EuiButton size="s" fill onClick={onClose} data-test-subj="boostErrorDetailsClose">
          {CLOSE_LABEL}
        </EuiButton>
      </EuiModalFooter>
    )}
  </div>
);

interface ErrorToastInput {
  title: string;
  /** What happened, when the title alone doesn't say. */
  text?: string;
  /** The details modal's body: what couldn't be done, and why. */
  details: ReactNode;
  /**
   * Tries again, from the details modal, which closes along with the toast. Omitted when there's
   * nothing to try again from here, such as a form that stays open to save again.
   */
  onRetry?: () => void;
}

/**
 * Shows a danger toast whose "View details" action opens a modal of what went wrong, with a button
 * to try again, if it can. Like core's error toasts, it stays up as long as they do, and its action
 * is EUI's toast action.
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
          onRetry={
            onRetry &&
            (() => {
              modal.close();
              toasts.remove(toast);
              onRetry();
            })
          }
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

interface RequestErrorInput extends Omit<ErrorDetailsProps, 'failures' | 'nameColumn'> {
  /** What couldn't be done, naming what it was for, which the details don't repeat. */
  title: string;
  onRetry?: () => void;
}

/** Says a request failed: the toast's title says what couldn't be done, and its details why. */
export const notifyRequestError = (
  services: ErrorDetailsServices,
  error: Error,
  { title, description, onRetry }: RequestErrorInput
): Toast =>
  showErrorToast(services, {
    title,
    details: <ErrorDetails description={description} failures={[describeRequestError(error)]} />,
    onRetry,
  });
