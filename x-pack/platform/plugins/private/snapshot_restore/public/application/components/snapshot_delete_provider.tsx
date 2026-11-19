/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useEuiMaxBreakpoint,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';

import { useServices, useToastNotifications } from '../app_context';
import { deleteSnapshots } from '../services/http';

interface Props {
  children: (deleteSnapshot: DeleteSnapshot) => React.ReactElement;
}

export type DeleteSnapshot = (
  ids: Array<{ snapshot: string; repository: string }>,
  onSuccess?: OnSuccessCallback
) => void;

type OnSuccessCallback = (
  snapshotsDeleted: Array<{ snapshot: string; repository: string }>
) => void;

export const SnapshotDeleteProvider: React.FunctionComponent<Props> = ({ children }) => {
  const { i18n } = useServices();
  const toastNotifications = useToastNotifications();

  const [snapshotIds, setSnapshotIds] = useState<Array<{ snapshot: string; repository: string }>>(
    []
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);
  const modalTitleId = useGeneratedHtmlId();
  // EuiConfirmModal anchors itself to the bottom of small screens; EuiModal fills them. Keep the confirmation layout.
  const confirmationModalStyles = css({
    [useEuiMaxBreakpoint('m')]: {
      insetBlockStart: 'auto',
    },
  });

  const deleteSnapshotPrompt: DeleteSnapshot = (ids, onSuccess = () => undefined) => {
    if (!ids || !ids.length) {
      throw new Error('No snapshot IDs specified for deletion');
    }
    // A deletion in flight owns the modal and the success callback until Elasticsearch answers.
    if (isDeleting) {
      return;
    }
    setIsModalOpen(true);
    setSnapshotIds(ids);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSnapshotIds([]);
  };

  // Dismissing the modal would not stop the deletion, so it stays open until the result arrives.
  const cancelDelete = () => {
    if (isDeleting) {
      return;
    }
    closeModal();
  };

  const deleteSnapshot = () => {
    const snapshotsToDelete = [...snapshotIds];
    setIsDeleting(true);
    deleteSnapshots(snapshotsToDelete).then(({ data, error }) => {
      const { itemsDeleted, errors } = data || { itemsDeleted: undefined, errors: undefined };

      // Report the result only after Elasticsearch completes the deletion request.
      closeModal();
      setIsDeleting(false);

      // Surface success notifications
      if (itemsDeleted && itemsDeleted.length) {
        const hasMultipleSuccesses = itemsDeleted.length > 1;
        const successMessage = hasMultipleSuccesses
          ? i18n.translate(
              'xpack.snapshotRestore.deleteSnapshot.successMultipleNotificationTitle',
              {
                defaultMessage: 'Deleted {count} snapshots',
                values: { count: itemsDeleted.length },
              }
            )
          : i18n.translate('xpack.snapshotRestore.deleteSnapshot.successSingleNotificationTitle', {
              defaultMessage: "Deleted snapshot ''{name}''",
              values: { name: itemsDeleted[0].snapshot },
            });
        toastNotifications.addSuccess(successMessage);
        if (onSuccessCallback.current) {
          onSuccessCallback.current([...itemsDeleted]);
        }
      }

      // Surface error notifications
      // `error` is generic server error
      // `data.errors` are specific errors with removing particular snapshot(s)
      if (error || (errors && errors.length)) {
        const hasMultipleErrors =
          (errors && errors.length > 1) || (error && snapshotsToDelete.length > 1);
        const errorMessage = hasMultipleErrors
          ? i18n.translate('xpack.snapshotRestore.deleteSnapshot.errorMultipleNotificationTitle', {
              defaultMessage: 'Error deleting {count} snapshots',
              values: {
                count: (errors && errors.length) || snapshotsToDelete.length,
              },
            })
          : i18n.translate('xpack.snapshotRestore.deleteSnapshot.errorSingleNotificationTitle', {
              defaultMessage: "Error deleting snapshot ''{name}''",
              values: { name: (errors && errors[0].id.snapshot) || snapshotsToDelete[0].snapshot },
            });
        toastNotifications.addDanger(errorMessage);
      }
    });
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    const isSingle = snapshotIds.length === 1;

    return (
      <EuiModal
        role="alertdialog"
        aria-labelledby={modalTitleId}
        onClose={cancelDelete}
        css={confirmationModalStyles}
        data-test-subj="srdeleteSnapshotConfirmationModal"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle id={modalTitleId} data-test-subj="confirmModalTitleText">
            {isSingle ? (
              <FormattedMessage
                id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deleteSingleTitle"
                defaultMessage="Delete snapshot ''{name}''?"
                values={{ name: snapshotIds[0].snapshot }}
              />
            ) : (
              <FormattedMessage
                id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deleteMultipleTitle"
                defaultMessage="Delete {count} snapshots?"
                values={{ count: snapshotIds.length }}
              />
            )}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText data-test-subj="confirmModalBodyText">
            {!isSingle ? (
              <Fragment>
                <p>
                  <FormattedMessage
                    id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deleteMultipleListDescription"
                    defaultMessage="You are about to delete these snapshots:"
                  />
                </p>
                <ul>
                  {snapshotIds.map(({ snapshot, repository }) => (
                    <li key={`${repository}/${snapshot}`}>{snapshot}</li>
                  ))}
                </ul>
              </Fragment>
            ) : null}
            <p>
              <FormattedMessage
                id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deleteMultipleDescription"
                defaultMessage="Restore operations associated with {count, plural, one {this snapshot} other {these snapshots}} will stop."
                values={{ count: snapshotIds.length }}
              />
            </p>
            {isDeleting ? (
              <KbnWarningCallout
                announceOnMount
                title={
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiLoadingSpinner />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <FormattedMessage
                        id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deletingCalloutTitle"
                        defaultMessage="Deleting {count, plural, one {snapshot} other {snapshots}}"
                        values={{ count: snapshotIds.length }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                text={
                  <p>
                    <FormattedMessage
                      id="xpack.snapshotRestore.deleteSnapshot.confirmModal.deletingCalloutDescription"
                      defaultMessage="This may take a few minutes."
                    />
                  </p>
                }
              />
            ) : null}
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            onClick={cancelDelete}
            isDisabled={isDeleting}
            data-test-subj="confirmModalCancelButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.deleteSnapshot.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
          <EuiButton
            onClick={deleteSnapshot}
            isDisabled={isDeleting}
            fill
            color="danger"
            data-test-subj="confirmModalConfirmButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.deleteSnapshot.confirmModal.confirmButtonLabel"
              defaultMessage="Delete {count, plural, one {snapshot} other {snapshots}}"
              values={{ count: snapshotIds.length }}
            />
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  };

  return (
    <Fragment>
      {children(deleteSnapshotPrompt)}
      {renderModal()}
    </Fragment>
  );
};
