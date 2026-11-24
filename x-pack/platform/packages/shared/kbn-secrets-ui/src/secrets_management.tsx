/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import type { SecretMetadata } from '@kbn/secrets';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { getSecretsErrorMessage } from './api';
import type { SecretsApi, SecretsHttpError } from './api';
import { SecretFlyout } from './secret_flyout';
import { SecretsTable } from './secrets_table';
import { DeleteSecretModal } from './delete_secret_modal';
import { useTestSecret } from './use_secret_mutations';
import { useSecretConnectors, useSecrets } from './use_secrets';

const HTTP_FORBIDDEN = 403;
const HTTP_UNAVAILABLE = 503;

const SecretsLoadError = ({ error }: { error: SecretsHttpError }) => {
  const status = error.response?.status;
  if (status === HTTP_UNAVAILABLE) {
    return (
      <KbnWarningCallout
        announceOnMount
        title={i18n.translate('xpack.secretsUi.unavailableTitle', {
          defaultMessage: 'Secrets are not available',
        })}
        data-test-subj="secretsUnavailable"
      >
        {getSecretsErrorMessage(error)}
      </KbnWarningCallout>
    );
  }
  return (
    <KbnDangerCallout
      announceOnMount
      title={
        status === HTTP_FORBIDDEN
          ? i18n.translate('xpack.secretsUi.forbiddenTitle', {
              defaultMessage: 'You do not have access to the secrets',
            })
          : i18n.translate('xpack.secretsUi.loadErrorTitle', {
              defaultMessage: 'The secrets could not be loaded',
            })
      }
      data-test-subj="secretsLoadError"
    >
      {getSecretsErrorMessage(error)}
    </KbnDangerCallout>
  );
};

export interface SecretsManagementProps {
  /** Calls the routes of the consumer. */
  api: SecretsApi;
  notifications: NotificationsStart;
  /** How the consumer refers to a secret by its name, such as `{{ secrets.name }}`. */
  getSecretReference: (name: string) => string;
}

/** Lists the secrets of a consumer, and creates, edits, deletes and tests them. Must be rendered within a `QueryClientProvider`. */
export const SecretsManagement = ({
  api,
  notifications,
  getSecretReference,
}: SecretsManagementProps) => {
  const { data, error, isLoading } = useSecrets(api);
  const { data: connectorsData, isLoading: isLoadingConnectors } = useSecretConnectors(api);
  const testSecret = useTestSecret({ api, notifications });
  // `null` when the flyout is closed, `{}` to create a secret and `{ secret }` to edit one.
  const [flyout, setFlyout] = useState<{ secret?: SecretMetadata } | null>(null);
  const [secretToDelete, setSecretToDelete] = useState<SecretMetadata | null>(null);

  const secrets = useMemo(() => data?.secrets ?? [], [data]);
  const connectors = useMemo(() => connectorsData?.connectors ?? [], [connectorsData]);
  const existingNames = useMemo(() => secrets.map(({ name }) => name), [secrets]);

  if (isLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="secretsLoading" />;
  }
  if (error) {
    return <SecretsLoadError error={error} />;
  }

  const createSecret = () => setFlyout({});

  return (
    <>
      {secrets.length === 0 ? (
        <EuiEmptyPrompt
          iconType="lock"
          title={
            <h2>
              {i18n.translate('xpack.secretsUi.emptyTitle', {
                defaultMessage: 'No secrets yet',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.secretsUi.emptyBody', {
                defaultMessage:
                  'A secret keeps a sensitive value, such as an API key, out of where it is used. It is referred to by name.',
              })}
            </p>
          }
          actions={
            <EuiButton
              fill
              iconType="plusCircle"
              onClick={createSecret}
              data-test-subj="secretCreateButton"
            >
              {i18n.translate('xpack.secretsUi.createButton', {
                defaultMessage: 'Create secret',
              })}
            </EuiButton>
          }
          data-test-subj="secretsEmptyState"
        />
      ) : (
        <SecretsTable
          secrets={secrets}
          connectors={connectors}
          getSecretReference={getSecretReference}
          testingSecretName={testSecret.isLoading ? testSecret.variables?.name : undefined}
          onTest={({ name }) => testSecret.mutate({ name })}
          onEdit={(secret) => setFlyout({ secret })}
          onDelete={setSecretToDelete}
          onCreate={createSecret}
        />
      )}
      {flyout ? (
        <SecretFlyout
          api={api}
          notifications={notifications}
          getSecretReference={getSecretReference}
          secret={flyout.secret}
          existingNames={existingNames}
          connectors={connectors}
          isLoadingConnectors={isLoadingConnectors}
          onClose={() => setFlyout(null)}
        />
      ) : null}
      {secretToDelete ? (
        <DeleteSecretModal
          api={api}
          notifications={notifications}
          secret={secretToDelete}
          onClose={() => setSecretToDelete(null)}
        />
      ) : null}
    </>
  );
};
