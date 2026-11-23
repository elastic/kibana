/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import React from 'react';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import type { SecretMetadata } from '@kbn/secrets';
import type { SecretsApi } from './api';
import { useDeleteSecret } from './use_secret_mutations';

interface DeleteSecretModalProps {
  api: SecretsApi;
  notifications: NotificationsStart;
  secret: SecretMetadata;
  onClose: () => void;
}

/** Asks for confirmation before deleting a secret. A failure is reported by a toast. */
export const DeleteSecretModal = ({
  api,
  notifications,
  secret: { name },
  onClose,
}: DeleteSecretModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'deleteSecretModalTitle' });
  const deleteSecret = useDeleteSecret({ api, notifications });

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.secretsUi.deleteModal.title', {
        defaultMessage: 'Delete "{name}"?',
        values: { name },
      })}
      onCancel={onClose}
      onConfirm={() => deleteSecret.mutate({ name }, { onSettled: onClose })}
      cancelButtonText={i18n.translate('xpack.secretsUi.deleteModal.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.secretsUi.deleteModal.confirm', {
        defaultMessage: 'Delete secret',
      })}
      buttonColor="danger"
      isLoading={deleteSecret.isLoading}
      data-test-subj="secretDeleteModal"
    >
      <EuiText size="s">
        {i18n.translate('xpack.secretsUi.deleteModal.body', {
          defaultMessage:
            'Anything that uses this secret stops working. A value stored in Kibana is lost. A value in a connector is not touched. This cannot be undone.',
        })}
      </EuiText>
    </EuiConfirmModal>
  );
};
