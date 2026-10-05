/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiConfirmModal,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import useLatest from 'react-use/lib/useLatest';
import useMountedState from 'react-use/lib/useMountedState';

import { isHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type {
  ServiceAccountBoundWorkload,
  ServiceAccountDirectoryEntry,
  ServiceAccountsAPIClient,
} from '../../service_accounts';

const WORKLOADS_PAGE_SIZE = 5;

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
      defaultMessage: 'Type',
    }),
    render: (workloadType: string) => <EuiBadge color="hollow">{workloadType}</EuiBadge>,
  },
];

/**
 * Deletes one service account after checking whether workloads are bound to it. Shows nothing
 * until that check answers, then asks the user to confirm, listing the bound workloads and warning
 * that they stop running when there are any.
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

  const isBound = state.status === 'bound';
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
      onConfirm={() => deleteAccount(isBound)}
      cancelButtonText={i18n.translate(
        'xpack.security.management.serviceAccounts.delete.cancelButton',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={
        isBound
          ? i18n.translate('xpack.security.management.serviceAccounts.delete.forceDeleteButton', {
              defaultMessage: 'Force delete account',
            })
          : i18n.translate('xpack.security.management.serviceAccounts.delete.confirmButton', {
              defaultMessage: 'Delete account',
            })
      }
      buttonColor="danger"
      defaultFocusedButton="cancel"
      isLoading={isDeleting}
      data-test-subj={isBound ? 'serviceAccountBoundModal' : 'serviceAccountDeleteConfirmModal'}
    >
      {isBound ? (
        <BoundWorkloads workloads={state.workloads} />
      ) : (
        <p>
          {i18n.translate('xpack.security.management.serviceAccounts.delete.confirmDescription', {
            defaultMessage: "You can't recover a deleted service account.",
          })}
        </p>
      )}
    </EuiConfirmModal>
  );
};

/** The warning and the paged list of workloads that stop running when the account is deleted. */
const BoundWorkloads = ({ workloads }: { workloads: ServiceAccountBoundWorkload[] }) => {
  const [pageIndex, setPageIndex] = useState(0);
  // The table goes back to its first page whenever it gets new items, so keep them stable across
  // renders, such as the one that starts the delete.
  const rows = useMemo(
    () => workloads.map((workload, rowKey): WorkloadRow => ({ ...workload, rowKey })),
    [workloads]
  );

  return (
    <>
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.security.management.serviceAccounts.delete.boundWarning', {
            defaultMessage:
              'This account is bound to the following {count, plural, one {# workload} other {# workloads}}. Removing it means that workloads will not be executed.',
            values: { count: workloads.length },
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText size="xs" data-test-subj="serviceAccountBoundWorkloadsSummary">
        <FormattedMessage
          id="xpack.security.management.serviceAccounts.delete.workloadsTableSummary"
          defaultMessage="Showing {start}-{end}"
          values={{
            start: <strong>{pageIndex * WORKLOADS_PAGE_SIZE + 1}</strong>,
            end: (
              <strong>{Math.min((pageIndex + 1) * WORKLOADS_PAGE_SIZE, workloads.length)}</strong>
            ),
          }}
        />
      </EuiText>
      <EuiInMemoryTable
        itemId="rowKey"
        items={rows}
        columns={workloadColumns}
        pagination={{ pageIndex, pageSize: WORKLOADS_PAGE_SIZE, showPerPageOptions: false }}
        onTableChange={({ page }: CriteriaWithPagination<WorkloadRow>) => setPageIndex(page.index)}
        tableCaption={i18n.translate(
          'xpack.security.management.serviceAccounts.delete.workloadsTableCaption',
          { defaultMessage: 'Bound workloads' }
        )}
        data-test-subj="serviceAccountBoundWorkloadsTable"
      />
    </>
  );
};
