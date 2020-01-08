/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { ApiKeyToInvalidate } from '../../../../../../common/model';
import { ApiKeysApi } from '../../../../../lib/api_keys_api';

interface Props {
  isAdmin: boolean;
  children: (invalidateApiKeys: InvalidateApiKeys) => React.ReactElement;
}

export type InvalidateApiKeys = (
  apiKeys: ApiKeyToInvalidate[],
  onSuccess?: OnSuccessCallback
) => void;

type OnSuccessCallback = (apiKeysInvalidated: ApiKeyToInvalidate[]) => void;

export const InvalidateProvider: React.FunctionComponent<Props> = ({ isAdmin, children }) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyToInvalidate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const invalidateApiKeyPrompt: InvalidateApiKeys = (keys, onSuccess = () => undefined) => {
    if (!keys || !keys.length) {
      throw new Error('No API key IDs specified for invalidation');
    }
    setIsModalOpen(true);
    setApiKeys(keys);
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setApiKeys([]);
  };

  const invalidateApiKey = async () => {
    let result;
    let error;
    let errors;

    try {
      result = await ApiKeysApi.invalidateApiKeys(apiKeys, isAdmin);
    } catch (e) {
      error = e;
    }

    closeModal();

    if (result) {
      const { itemsInvalidated } = result;
      ({ errors } = result);

      // Surface success notifications
      if (itemsInvalidated && itemsInvalidated.length) {
        const hasMultipleSuccesses = itemsInvalidated.length > 1;
        const successMessage = hasMultipleSuccesses
          ? i18n.translate(
              'xpack.security.management.apiKeys.invalidateApiKey.successMultipleNotificationTitle',
              {
                defaultMessage: 'Invalidated {count} API keys',
                values: { count: itemsInvalidated.length },
              }
            )
          : i18n.translate(
              'xpack.security.management.apiKeys.invalidateApiKey.successSingleNotificationTitle',
              {
                defaultMessage: "Invalidated API key '{name}'",
                values: { name: itemsInvalidated[0].name },
              }
            );
        toastNotifications.addSuccess(successMessage);
        if (onSuccessCallback.current) {
          onSuccessCallback.current([...itemsInvalidated]);
        }
      }
    }

    // Surface error notifications
    // `error` is generic server error
    // `errors` are specific errors with removing particular API keys
    if (error || (errors && errors.length)) {
      const hasMultipleErrors = (errors && errors.length > 1) || (error && apiKeys.length > 1);
      const errorMessage = hasMultipleErrors
        ? i18n.translate(
            'xpack.security.management.apiKeys.invalidateApiKey.errorMultipleNotificationTitle',
            {
              defaultMessage: 'Error deleting {count} apiKeys',
              values: {
                count: (errors && errors.length) || apiKeys.length,
              },
            }
          )
        : i18n.translate(
            'xpack.security.management.apiKeys.invalidateApiKey.errorSingleNotificationTitle',
            {
              defaultMessage: "Error deleting API key '{name}'",
              values: { name: (errors && errors[0].name) || apiKeys[0].name },
            }
          );
      toastNotifications.addDanger(errorMessage);
    }
  };

  const renderModal = () => {
    if (!isModalOpen) {
      return null;
    }

    const isSingle = apiKeys.length === 1;

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            isSingle
              ? i18n.translate(
                  'xpack.security.management.apiKeys.invalidateApiKey.confirmModal.invalidateSingleTitle',
                  {
                    defaultMessage: "Invalidate API key '{name}'?",
                    values: { name: apiKeys[0].name },
                  }
                )
              : i18n.translate(
                  'xpack.security.management.apiKeys.invalidateApiKey.confirmModal.invalidateMultipleTitle',
                  {
                    defaultMessage: 'Invalidate {count} API keys?',
                    values: { count: apiKeys.length },
                  }
                )
          }
          onCancel={closeModal}
          onConfirm={invalidateApiKey}
          cancelButtonText={i18n.translate(
            'xpack.security.management.apiKeys.invalidateApiKey.confirmModal.cancelButtonLabel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.security.management.apiKeys.invalidateApiKey.confirmModal.confirmButtonLabel',
            {
              defaultMessage: 'Invalidate {count, plural, one {API key} other {API keys}}',
              values: { count: apiKeys.length },
            }
          )}
          buttonColor="danger"
          data-test-subj="invalidateApiKeyConfirmationModal"
        >
          {!isSingle ? (
            <Fragment>
              <p>
                {i18n.translate(
                  'xpack.security.management.apiKeys.invalidateApiKey.confirmModal.invalidateMultipleListDescription',
                  { defaultMessage: 'You are about to invalidate these API keys:' }
                )}
              </p>
              <ul>
                {apiKeys.map(({ name, id }) => (
                  <li key={id}>{name}</li>
                ))}
              </ul>
            </Fragment>
          ) : null}
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(invalidateApiKeyPrompt)}
      {renderModal()}
    </Fragment>
  );
};
