/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import React, { useCallback } from 'react';

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { ConnectedBy } from './application_connections_table/connected_by';
import { labels } from './constants/i18n';
import type {
  ApplicationConnectionsActionMode,
  ApplicationConnectionsModalConnection,
  ApplicationConnectionTarget,
} from './constants/types';
import { useDeleteConnections } from './hooks/use_delete_connections';
import { useRevokeConnections } from './hooks/use_revoke_connections';
import { RevokeClientDetailsPopover } from './revoke_client_details_popover';

interface ApplicationConnectionsActionCopy {
  title: (count: number) => string;
  intro: string;
  tableCaption: string;
  connectionNameColumn: string;
  clientNameColumn: string;
  connectedByColumn: string;
  calloutTitle: (count: number) => string;
  reconnectionNote: string;
  cancelButton: string;
  confirmButton: string;
  successToast: (count: number) => string;
  allFailedToast: (count: number) => string;
  partialFailedToast: (succeeded: number, total: number) => string;
  unexpectedErrorToast: string;
}

interface ApplicationConnectionsActionTestSubjects {
  modal: string;
  cancelButton: string;
  confirmButton: string;
  table: string;
}

const MODE_COPY: Record<ApplicationConnectionsActionMode, ApplicationConnectionsActionCopy> = {
  revoke: labels.revoke,
  delete: labels.delete,
};

const MODE_TEST_SUBJ: Record<
  ApplicationConnectionsActionMode,
  ApplicationConnectionsActionTestSubjects
> = {
  revoke: {
    modal: 'applicationConnectionsRevokeModal',
    cancelButton: 'applicationConnectionsRevokeCancelButton',
    confirmButton: 'applicationConnectionsRevokeConfirmButton',
    table: 'applicationConnectionsRevokeModalTable',
  },
  delete: {
    modal: 'applicationConnectionsDeleteModal',
    cancelButton: 'applicationConnectionsDeleteCancelButton',
    confirmButton: 'applicationConnectionsDeleteConfirmButton',
    table: 'applicationConnectionsDeleteModalTable',
  },
};

export interface ApplicationConnectionsActionModalProps {
  mode: ApplicationConnectionsActionMode;
  connections: ApplicationConnectionsModalConnection[];
  onClose: () => void;
  onSettled?: (affected: ApplicationConnectionTarget[]) => void;
}

export const ApplicationConnectionsActionModal = ({
  mode,
  connections,
  onClose,
  onSettled,
}: ApplicationConnectionsActionModalProps) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: `applicationConnections${mode}ModalTitle` });
  const { revokeConnections, isRevoking } = useRevokeConnections();
  const { deleteConnections, isDeleting } = useDeleteConnections();
  const { services } = useKibana<CoreStart>();
  const { toasts } = services.notifications;

  const copy = MODE_COPY[mode];
  const testSubj = MODE_TEST_SUBJ[mode];
  const isSubmitting = mode === 'revoke' ? isRevoking : isDeleting;

  const count = connections.length;

  const handleConfirm = useCallback(async () => {
    const targets: ApplicationConnectionTarget[] = connections.map(({ client, connectionId }) => ({
      clientId: client.id,
      connectionId,
    }));

    try {
      const { results } =
        mode === 'revoke'
          ? await revokeConnections({ connections: targets })
          : await deleteConnections({ connections: targets });

      const failures = results.filter((result) => result.status === 'error');
      const affected: ApplicationConnectionTarget[] = results
        .filter((result) => result.status !== 'error')
        .map(({ clientId, connectionId }) => ({ clientId, connectionId }));

      if (affected.length > 0) {
        onSettled?.(affected);
      }

      if (failures.length === 0) {
        toasts.addSuccess({ title: copy.successToast(results.length) });
        onClose();
        return;
      }

      if (failures.length === results.length) {
        toasts.addDanger({ title: copy.allFailedToast(results.length) });
        return;
      }

      toasts.addWarning({
        title: copy.partialFailedToast(affected.length, results.length),
      });
      onClose();
    } catch (error) {
      toasts.addDanger({
        title: copy.unexpectedErrorToast,
        text: error instanceof Error ? error.message : String(error),
      });
    }
  }, [mode, revokeConnections, deleteConnections, connections, onSettled, toasts, onClose, copy]);

  const columns: Array<EuiBasicTableColumn<ApplicationConnectionsModalConnection>> = [
    {
      field: 'connectionName',
      name: copy.connectionNameColumn,
      render: (_value, item) => item.connectionName ?? item.connectionId,
    },
    {
      field: 'client.client_name',
      name: copy.clientNameColumn,
      render: (_value, item) => <RevokeClientDetailsPopover client={item.client} />,
    },
    {
      field: 'userId',
      name: copy.connectedByColumn,
      render: (_value, item) => <ConnectedBy userId={item.userId} user={item.user} />,
    },
  ];

  if (count === 0) {
    return null;
  }

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onClose}
      data-test-subj={testSubj.modal}
      maxWidth={680}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{copy.title(count)}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>{copy.intro}</p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiBasicTable
          tableCaption={copy.tableCaption}
          items={connections}
          columns={columns}
          itemId={(item) => `${item.client.id}-${item.connectionId}`}
          rowHeader="connectionName"
          data-test-subj={testSubj.table}
        />
        <EuiSpacer size="m" />
        <KbnWarningCallout title={copy.calloutTitle(count)} size="s" />
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p>{copy.reconnectionNote}</p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj={testSubj.cancelButton}>
          {copy.cancelButton}
        </EuiButtonEmpty>
        <EuiButton
          color="danger"
          fill
          onClick={handleConfirm}
          isLoading={isSubmitting}
          disabled={isSubmitting}
          data-test-subj={testSubj.confirmButton}
        >
          {copy.confirmButton}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
