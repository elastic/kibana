/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { UseMutationResult } from '@kbn/react-query';
import { SECRET_PROVIDER_TYPE } from '@kbn/secrets';
import type {
  DeleteSecretParams,
  UpdateSecretParams,
  SecretMetadata,
  SecretTestResult,
  TestSecretParams,
  WriteSecretParams,
} from '@kbn/secrets';
import { getSecretsErrorMessage } from './api';
import type { SecretsApi, SecretsHttpError } from './api';
import { getSecretsQueryKey } from './use_secrets';

interface SecretMutationDeps {
  api: SecretsApi;
  notifications: NotificationsStart;
}

/**
 * Warns when the value of a secret that was just saved cannot be read. A secret from a connector
 * is saved even then, so that it can be set up before its value exists in the secret manager.
 */
const warnIfUnreadable = async ({
  api,
  notifications,
  name,
  source,
}: SecretMutationDeps & Pick<UpdateSecretParams, 'name' | 'source'>): Promise<void> => {
  if (source?.provider !== SECRET_PROVIDER_TYPE.connector) {
    return;
  }
  // The secret is saved whatever happens here: a test that fails to run is not reported.
  const result = await api.testSecret({ name }).catch(() => undefined);
  if (result && !result.resolved) {
    notifications.toasts.addWarning({
      title: i18n.translate('xpack.secretsUi.savedUnreadableToast', {
        defaultMessage: 'Secret "{name}" was saved, but its value could not be read',
        values: { name },
      }),
      text: result.message,
    });
  }
};

/**
 * Creates a secret. A failure is left to the caller, because the form shows it next to the
 * fields that caused it.
 */
export const useCreateSecret = ({
  api,
  notifications,
}: SecretMutationDeps): UseMutationResult<SecretMetadata, SecretsHttpError, WriteSecretParams> => {
  const queryClient = useQueryClient();
  return useMutation<SecretMetadata, SecretsHttpError, WriteSecretParams>({
    mutationFn: api.createSecret,
    onSuccess: (_data, { name, source }) => {
      queryClient.invalidateQueries({ queryKey: getSecretsQueryKey(api) });
      notifications.toasts.addSuccess(
        i18n.translate('xpack.secretsUi.createSuccessToast', {
          defaultMessage: 'Secret "{name}" created',
          values: { name },
        })
      );
      warnIfUnreadable({ api, notifications, name, source });
    },
  });
};

/** Updates the source of a secret, its description, or both. Its name cannot change. */
export const useUpdateSecret = ({
  api,
  notifications,
}: SecretMutationDeps): UseMutationResult<SecretMetadata, SecretsHttpError, UpdateSecretParams> => {
  const queryClient = useQueryClient();
  return useMutation<SecretMetadata, SecretsHttpError, UpdateSecretParams>({
    mutationFn: api.updateSecret,
    onSuccess: (_data, { name, source }) => {
      queryClient.invalidateQueries({ queryKey: getSecretsQueryKey(api) });
      notifications.toasts.addSuccess(
        i18n.translate('xpack.secretsUi.updateSuccessToast', {
          defaultMessage: 'Secret "{name}" updated',
          values: { name },
        })
      );
      warnIfUnreadable({ api, notifications, name, source });
    },
  });
};

export const useDeleteSecret = ({
  api,
  notifications,
}: SecretMutationDeps): UseMutationResult<void, SecretsHttpError, DeleteSecretParams> => {
  const queryClient = useQueryClient();
  return useMutation<void, SecretsHttpError, DeleteSecretParams>({
    mutationFn: api.deleteSecret,
    onSuccess: (_data, { name }) => {
      queryClient.invalidateQueries({ queryKey: getSecretsQueryKey(api) });
      notifications.toasts.addSuccess(
        i18n.translate('xpack.secretsUi.deleteSuccessToast', {
          defaultMessage: 'Secret "{name}" deleted',
          values: { name },
        })
      );
    },
    onError: (error, { name }) => {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.secretsUi.deleteErrorToast', {
          defaultMessage: 'Failed to delete secret "{name}"',
          values: { name },
        }),
        text: getSecretsErrorMessage(error),
      });
    },
  });
};

/** Checks that a stored secret can be read, and says so in a toast. The value never reaches the browser. */
export const useTestSecret = ({
  api,
  notifications,
}: SecretMutationDeps): UseMutationResult<SecretTestResult, SecretsHttpError, TestSecretParams> =>
  useMutation<SecretTestResult, SecretsHttpError, TestSecretParams>({
    mutationFn: api.testSecret,
    onSuccess: (result, { name }) => {
      if (result.resolved) {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.secretsUi.testSuccessToast', {
            defaultMessage: 'The value of "{name}" was read',
            values: { name },
          })
        );
        return;
      }
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.secretsUi.testFailureToast', {
          defaultMessage: 'The value of "{name}" could not be read',
          values: { name },
        }),
        text: result.message,
      });
    },
    onError: (error, { name }) => {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.secretsUi.testErrorToast', {
          defaultMessage: 'Failed to test "{name}"',
          values: { name },
        }),
        text: getSecretsErrorMessage(error),
      });
    },
  });
