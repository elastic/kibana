/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiCheckbox, EuiConfirmModal, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface DeleteImportModalProps {
  importName: string;
  /**
   * A managed import sits on the user's own connector and a shared workflow. Only the connector
   * can be deleted with it, and that is off by default.
   */
  isManaged?: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  /** `deleteResources` is true when the connector (and for a custom import the workflow) should go too. */
  onConfirm: (deleteResources: boolean) => void;
}

export const DeleteImportModal = ({
  importName,
  isManaged = false,
  isLoading = false,
  onCancel,
  onConfirm,
}: DeleteImportModalProps) => {
  const titleId = useGeneratedHtmlId();
  const checkboxId = useGeneratedHtmlId();
  const [deleteResources, setDeleteResources] = useState(!isManaged);

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.alertingV2.imports.deleteModal.title', {
        defaultMessage: 'Delete import',
      })}
      onCancel={onCancel}
      onConfirm={() => onConfirm(deleteResources)}
      cancelButtonText={i18n.translate('xpack.alertingV2.imports.deleteModal.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.alertingV2.imports.deleteModal.confirm', {
        defaultMessage: 'Delete',
      })}
      buttonColor="danger"
      isLoading={isLoading}
      data-test-subj="importsDeleteModal"
    >
      <EuiText size="s">
        <p>
          {isManaged ? (
            <FormattedMessage
              id="xpack.alertingV2.imports.deleteModal.managedBody"
              defaultMessage="Delete {name}? Alerts it already created stay in the alerts list. The connector keeps receiving events, and the shared workflow keeps creating alerts for it, unless you delete the connector too."
              values={{ name: <strong>{importName}</strong> }}
            />
          ) : (
            <FormattedMessage
              id="xpack.alertingV2.imports.deleteModal.body"
              defaultMessage="Delete {name}? Alerts it already created stay in the alerts list."
              values={{ name: <strong>{importName}</strong> }}
            />
          )}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiCheckbox
        id={checkboxId}
        checked={deleteResources}
        disabled={isLoading}
        onChange={(event) => setDeleteResources(event.target.checked)}
        label={
          isManaged
            ? i18n.translate('xpack.alertingV2.imports.deleteModal.deleteConnector', {
                defaultMessage: 'Also delete the connector',
              })
            : i18n.translate('xpack.alertingV2.imports.deleteModal.deleteResources', {
                defaultMessage: 'Also delete the webhook connector and workflow',
              })
        }
        data-test-subj="importsDeleteResourcesCheckbox"
      />
    </EuiConfirmModal>
  );
};
