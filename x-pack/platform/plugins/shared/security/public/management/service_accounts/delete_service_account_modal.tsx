/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButton,
  EuiConfirmModal,
  EuiInMemoryTable,
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
import { i18n } from '@kbn/i18n';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type {
  ServiceAccountBoundWorkload,
  ServiceAccountDirectoryEntry,
  ServiceAccountsAPIClient,
} from '../../service_accounts';

export interface DeleteServiceAccountModalProps {
  serviceAccount: Pick<ServiceAccountDirectoryEntry, 'id' | 'name'>;
  serviceAccountsAPIClient: Pick<
    PublicMethodsOf<ServiceAccountsAPIClient>,
    'delete' | 'listWorkloads'
  >;
  onClose: () => void;
  /** Called once the account is deleted, with anything the delete could not clean up. */
  onDeleted: (warnings: string[]) => void;
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
 * A bound workload as the table shows it. The same workload id can be bound in more than one
 * space, and the space is not reported, so rows are keyed by position.
 */
interface WorkloadRow extends ServiceAccountBoundWorkload {
  rowKey: number;
}

const workloadColumns: Array<EuiBasicTableColumn<WorkloadRow>> = [
  {
    field: 'displayName',
    name: i18n.translate('xpack.security.management.serviceAccounts.delete.workloadNameColumn', {
      defaultMessage: 'Name',
    }),
    truncateText: true,
  },
  {
    field: 'workloadType',
    name: i18n.translate('xpack.security.management.serviceAccounts.delete.workloadTypeColumn', {
      defaultMessage: 'Workload type',
    }),
  },
];

/**
 * Deletes one service account after checking that no workloads are bound to it. Shows nothing
 * until that check answers, then either asks the user to confirm or lists the bound workloads and
 * only offers to close.
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

  const deleteAccount = async () => {
    setIsDeleting(true);
    let warnings: string[];
    try {
      ({ warnings } = await serviceAccountsAPIClient.delete(id));
    } catch (error) {
      if (!isMounted()) return;
      setIsDeleting(false);

      const workloads = getBoundWorkloads(error);
      if (workloads) {
        setState({ status: 'bound', workloads });
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

    if (isMounted()) onDeleted(warnings);
  };

  if (state.status === 'loading') {
    return null;
  }

  if (state.status === 'confirm') {
    return (
      <EuiConfirmModal
        aria-labelledby={titleId}
        titleProps={{ id: titleId }}
        title={i18n.translate('xpack.security.management.serviceAccounts.delete.confirmTitle', {
          defaultMessage: 'Delete "{name}"?',
          values: { name },
        })}
        onCancel={() => {
          if (!isDeleting) onClose();
        }}
        onConfirm={deleteAccount}
        cancelButtonText={i18n.translate(
          'xpack.security.management.serviceAccounts.delete.cancelButton',
          { defaultMessage: 'Cancel' }
        )}
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

  const { workloads } = state;
  return (
    <EuiModal aria-labelledby={titleId} onClose={onClose} data-test-subj="serviceAccountBoundModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.security.management.serviceAccounts.delete.boundTitle', {
            defaultMessage: 'Unable to delete "{name}"',
            values: { name },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.security.management.serviceAccounts.delete.boundDescription', {
              defaultMessage:
                'This service account is bound to {count, plural, one {# workload} other {# workloads}}. Unbind it from each workload, then try again.',
              values: { count: workloads.length },
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiInMemoryTable
          itemId="rowKey"
          items={workloads.map((workload, rowKey): WorkloadRow => ({ ...workload, rowKey }))}
          columns={workloadColumns}
          pagination={{ initialPageSize: 5, showPerPageOptions: false }}
          tableCaption={i18n.translate(
            'xpack.security.management.serviceAccounts.delete.workloadsTableCaption',
            { defaultMessage: 'Bound workloads' }
          )}
          data-test-subj="serviceAccountBoundWorkloadsTable"
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton fill onClick={onClose} data-test-subj="serviceAccountBoundModalClose">
          {i18n.translate('xpack.security.management.serviceAccounts.delete.closeButton', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
