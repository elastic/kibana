/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import useLatest from 'react-use/lib/useLatest';
import useMountedState from 'react-use/lib/useMountedState';

import { isHttpFetchError } from '@kbn/core-http-browser';
import type { ServiceAccountBoundWorkload } from '@kbn/core-security-common';
import { i18n } from '@kbn/i18n';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { BoundWorkloadsTable } from './bound_workloads_table';
import type {
  ServiceAccountDirectoryEntry,
  ServiceAccountsAPIClient,
} from '../../service_accounts';

/**
 * What came of a confirmed delete. An account deleted from somewhere else in the meantime is
 * already gone, which is what the user asked for.
 */
export type DeleteServiceAccountOutcome =
  | { status: 'deleted'; warnings: string[] }
  | { status: 'already_deleted' };

export interface DeleteServiceAccountModalProps {
  serviceAccount: Pick<ServiceAccountDirectoryEntry, 'id' | 'name'>;
  serviceAccountsAPIClient: Pick<
    PublicMethodsOf<ServiceAccountsAPIClient>,
    'delete' | 'listWorkloads'
  >;
  onClose: () => void;
  /** Called once the account is gone, with any warnings about what the delete left behind. */
  onDeleted: (outcome: DeleteServiceAccountOutcome) => void;
  onError: (error: Error, title: string) => void;
}

type ModalState =
  | { status: 'loading' }
  | { status: 'confirm' }
  | { status: 'bound'; workloads: ServiceAccountBoundWorkload[] };

/**
 * The workloads the delete route reports in its 409, or `undefined` for any other failure. The
 * route answers a 409 when a workload was bound after the modal checked.
 */
const getBoundWorkloads = (error: unknown): ServiceAccountBoundWorkload[] | undefined => {
  if (!isHttpFetchError(error) || error.response?.status !== 409) {
    return undefined;
  }

  const attributes =
    error.body && typeof error.body === 'object' && 'attributes' in error.body
      ? error.body.attributes
      : undefined;
  const workloads =
    attributes && typeof attributes === 'object' && 'workloads' in attributes
      ? attributes.workloads
      : undefined;

  return Array.isArray(workloads) ? workloads : undefined;
};

/**
 * Deletes one service account after checking whether workloads are bound to it. Shows a loading
 * state until that check answers, then asks the user to confirm, listing the bound workloads and
 * warning that they stop running when there are any.
 */
export const DeleteServiceAccountModal = ({
  serviceAccount: { id, name },
  serviceAccountsAPIClient,
  onClose,
  onDeleted,
  onError,
}: DeleteServiceAccountModalProps) => {
  const [state, setState] = useState<ModalState>({ status: 'loading' });
  const [isDeleting, setIsDeleting] = useState(false);
  const isMounted = useMountedState();
  const callbacks = useLatest({ onClose, onError });
  const titleId = useGeneratedHtmlId({ prefix: 'deleteServiceAccountModalTitle' });

  useEffect(() => {
    let isCurrent = true;
    serviceAccountsAPIClient.listWorkloads(id).then(
      ({ workloads }) => {
        if (isCurrent) {
          setState(workloads.length > 0 ? { status: 'bound', workloads } : { status: 'confirm' });
        }
      },
      (error) => {
        if (isCurrent) {
          callbacks.current.onError(
            error,
            i18n.translate('xpack.security.management.serviceAccounts.delete.checkErrorTitle', {
              defaultMessage: 'Unable to check the workloads of "{name}"',
              values: { name },
            })
          );
          callbacks.current.onClose();
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [id, name, serviceAccountsAPIClient, callbacks]);

  const deleteAccount = async (force: boolean) => {
    setIsDeleting(true);
    let warnings: string[];
    try {
      ({ warnings } = await serviceAccountsAPIClient.delete(id, { force }));
    } catch (error) {
      if (!isMounted()) return;
      setIsDeleting(false);

      const workloads = getBoundWorkloads(error);
      if (workloads) {
        setState({ status: 'bound', workloads });
        return;
      }

      if (isHttpFetchError(error) && error.response?.status === 404) {
        onDeleted({ status: 'already_deleted' });
        return;
      }

      onError(
        error,
        i18n.translate('xpack.security.management.serviceAccounts.delete.deleteErrorTitle', {
          defaultMessage: 'Unable to delete "{name}"',
          values: { name },
        })
      );
      return;
    }

    if (isMounted()) onDeleted({ status: 'deleted', warnings });
  };

  const title = i18n.translate('xpack.security.management.serviceAccounts.delete.confirmTitle', {
    defaultMessage: 'Delete "{name}"?',
    values: { name },
  });
  const cancelButtonText = i18n.translate(
    'xpack.security.management.serviceAccounts.delete.cancelButton',
    { defaultMessage: 'Cancel' }
  );
  const cancel = () => {
    if (!isDeleting) onClose();
  };

  // Looking up the bound workloads can take a while, since each workload type resolves its own,
  // so the modal opens right away and can be cancelled while it waits.
  if (state.status === 'loading') {
    return (
      <EuiModal
        aria-labelledby={titleId}
        onClose={cancel}
        initialFocus="[data-test-subj=serviceAccountDeleteLoadingCancel]"
        data-test-subj="serviceAccountDeleteLoadingModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner
                size="l"
                aria-label={i18n.translate(
                  'xpack.security.management.serviceAccounts.delete.loadingWorkloads',
                  { defaultMessage: 'Checking for bound workloads' }
                )}
                data-test-subj="serviceAccountDeleteLoading"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={cancel} data-test-subj="serviceAccountDeleteLoadingCancel">
            {cancelButtonText}
          </EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    );
  }

  if (state.status === 'confirm') {
    return (
      <EuiConfirmModal
        aria-labelledby={titleId}
        titleProps={{ id: titleId }}
        title={title}
        onCancel={cancel}
        onConfirm={() => deleteAccount(false)}
        cancelButtonText={cancelButtonText}
        confirmButtonText={i18n.translate(
          'xpack.security.management.serviceAccounts.delete.confirmButton',
          { defaultMessage: 'Delete account' }
        )}
        buttonColor="danger"
        defaultFocusedButton="cancel"
        isLoading={isDeleting}
        data-test-subj="serviceAccountDeleteConfirmModal"
      >
        <p>
          {i18n.translate('xpack.security.management.serviceAccounts.delete.confirmDescription', {
            defaultMessage: "You can't recover a deleted service account.",
          })}
        </p>
      </EuiConfirmModal>
    );
  }

  // Not an `EuiConfirmModal`: it wraps its body in `EuiText`, whose list styles leak into the
  // table's pagination.
  return (
    <EuiModal
      aria-labelledby={titleId}
      onClose={cancel}
      initialFocus="[data-test-subj=serviceAccountBoundModalCancel]"
      data-test-subj="serviceAccountBoundModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.security.management.serviceAccounts.delete.boundWarning', {
              defaultMessage:
                'This account is bound to the following {count, plural, one {# workload} other {# workloads}}. Removing it means that workloads will not be executed.',
              values: { count: state.workloads.length },
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <BoundWorkloadsTable workloads={state.workloads} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={cancel} data-test-subj="serviceAccountBoundModalCancel">
          {cancelButtonText}
        </EuiButtonEmpty>
        <EuiButton
          color="danger"
          fill
          isLoading={isDeleting}
          onClick={() => deleteAccount(true)}
          data-test-subj="serviceAccountForceDeleteButton"
        >
          {i18n.translate('xpack.security.management.serviceAccounts.delete.forceDeleteButton', {
            defaultMessage: 'Force delete account',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
