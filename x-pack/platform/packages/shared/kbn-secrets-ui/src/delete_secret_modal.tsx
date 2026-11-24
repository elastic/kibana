/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import React from 'react';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import type { SecretMetadata } from '@kbn/secrets';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { SecretsApi } from './api';
import { SecretUsageList } from './secret_usage';
import { useDeleteSecret } from './use_secret_mutations';
import { useSecretUsage } from './use_secrets';

interface DeleteSecretModalProps {
  api: SecretsApi;
  notifications: NotificationsStart;
  secret: SecretMetadata;
  /** Where an item that uses the secret can be opened, by its id. */
  getUsageItemHref?: (id: string) => string;
  onClose: () => void;
}

/** Asks for confirmation before deleting a secret. A failure is reported by a toast. */
export const DeleteSecretModal = ({
  api,
  notifications,
  secret: { name },
  getUsageItemHref,
  onClose,
}: DeleteSecretModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'deleteSecretModalTitle' });
  const deleteSecret = useDeleteSecret({ api, notifications });
  // Deleting is never blocked: what uses the secret is shown so that the user knows what breaks.
  const { data: usage, isError: isUsageError } = useSecretUsage({ api, name, enabled: true });
  const isInUse = usage !== undefined && usage.visibleCount + usage.hiddenCount > 0;

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
      {isInUse ? (
        <>
          <KbnWarningCallout
            title={i18n.translate('xpack.secretsUi.deleteModal.inUseTitle', {
              defaultMessage: 'This secret is in use',
            })}
            data-test-subj="secretDeleteInUse"
          >
            <SecretUsageList usage={usage} getItemHref={getUsageItemHref} />
          </KbnWarningCallout>
          <EuiSpacer size="m" />
        </>
      ) : null}
      {isUsageError ? (
        <>
          <EuiText size="s" color="subdued" data-test-subj="secretDeleteUsageError">
            {i18n.translate('xpack.secretsUi.deleteModal.usageError', {
              defaultMessage: 'Where this secret is used could not be checked.',
            })}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      ) : null}
      <EuiText size="s">
        {i18n.translate('xpack.secretsUi.deleteModal.body', {
          defaultMessage:
            'Anything that uses this secret stops working. A value stored in Kibana is lost. A value in a connector is not touched. This cannot be undone.',
        })}
      </EuiText>
    </EuiConfirmModal>
  );
};
