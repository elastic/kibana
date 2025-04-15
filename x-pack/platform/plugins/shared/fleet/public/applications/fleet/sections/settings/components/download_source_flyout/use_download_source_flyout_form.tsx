/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { useSecretInput, useComboInput } from '../../../../hooks';
import {
  sendPostDownloadSource,
  useInput,
  useSwitchInput,
  useStartServices,
  sendPutDownloadSource,
  useAuthz,
} from '../../../../hooks';
import type { DownloadSource, PostDownloadSourceRequest } from '../../../../types';
import { useConfirmModal } from '../../hooks/use_confirm_modal';

import type { DownloadSourceBase } from '../../../../../../../common/types';

import { confirmUpdate } from './confirm_update';

export interface DownloadSourceFormInputsType {
  nameInput: ReturnType<typeof useInput>;
  defaultDownloadSourceInput: ReturnType<typeof useSwitchInput>;
  hostInput: ReturnType<typeof useInput>;
  proxyIdInput: ReturnType<typeof useInput>;
  sslCertificateInput: ReturnType<typeof useInput>;
  sslKeyInput: ReturnType<typeof useInput>;
  sslKeySecretInput: ReturnType<typeof useSecretInput>;
  sslCertificateAuthoritiesInput: ReturnType<typeof useComboInput>;
}

export function useDowloadSourceFlyoutForm(onSuccess: () => void, downloadSource?: DownloadSource) {
  const authz = useAuthz();
  const [isLoading, setIsloading] = useState(false);
  const { notifications } = useStartServices();
  const { confirm } = useConfirmModal();

  const isEditDisabled = !authz.fleet.allSettings;

  const nameInput = useInput(downloadSource?.name ?? '', validateName, isEditDisabled);

  const defaultDownloadSourceInput = useSwitchInput(
    downloadSource?.is_default ?? false,
    downloadSource?.is_default || isEditDisabled
  );

  const hostInput = useInput(downloadSource?.host ?? '', validateHost, isEditDisabled);

  const proxyIdInput = useInput(downloadSource?.proxy_id ?? '', () => undefined, isEditDisabled);

  const sslCertificateAuthoritiesInput = useComboInput(
    'sslCertificateAuthoritiesComboxBox',
    downloadSource?.ssl?.certificate_authorities ?? [],
    undefined,
    undefined
  );
  const sslCertificateInput = useInput(
    downloadSource?.ssl?.certificate ?? '',
    undefined,
    undefined
  );
  const sslKeyInput = useInput(downloadSource?.ssl?.key ?? '', undefined, undefined);

  const sslKeySecretInput = useSecretInput(
    (downloadSource as DownloadSourceBase)?.secrets?.ssl?.key,
    undefined,
    undefined
  );

  const inputs = {
    nameInput,
    hostInput,
    defaultDownloadSourceInput,
    proxyIdInput,
    sslCertificateInput,
    sslKeyInput,
    sslCertificateAuthoritiesInput,
    sslKeySecretInput,
  };

  const hasChanged = Object.values(inputs).some((input) => input.hasChanged);

  const validate = useCallback(() => {
    const nameInputValid = nameInput.validate();
    const hostValid = hostInput.validate();

    const sslCertificateValid = sslCertificateInput.validate();
    const sslKeyValid = sslKeyInput.validate();
    const sslKeySecretValid = sslKeySecretInput.validate();

    return nameInputValid && hostValid && sslCertificateValid && sslKeyValid && sslKeySecretValid;
  }, [nameInput, hostInput, sslCertificateInput, sslKeyInput, sslKeySecretInput]);

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      setIsloading(true);

      const data: PostDownloadSourceRequest['body'] = {
        name: nameInput.value.trim(),
        host: hostInput.value.trim(),
        is_default: defaultDownloadSourceInput.value,
        proxy_id: proxyIdInput.value || null,
        ssl: {
          certificate: sslCertificateInput.value,
          key: sslKeyInput.value || undefined,
          certificate_authorities: sslCertificateAuthoritiesInput.value.filter((val) => val !== ''),
        },
        ...(!sslKeyInput.value &&
          sslKeySecretInput.value && {
            secrets: {
              ssl: {
                key: sslKeySecretInput.value || undefined,
              },
            },
          }),
      };

      if (downloadSource) {
        // Update
        if (!(await confirmUpdate(downloadSource, confirm))) {
          setIsloading(false);
          return;
        }

        const res = await sendPutDownloadSource(downloadSource.id, data);
        if (res.error) {
          throw res.error;
        }
      } else {
        // Create
        const res = await sendPostDownloadSource(data);
        if (res.error) {
          throw res.error;
        }
      }

      onSuccess();
      setIsloading(false);
    } catch (err) {
      setIsloading(false);
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.errorToastTitle', {
          defaultMessage: 'Error while saving binary source',
        }),
      });
    }
  }, [
    confirm,
    defaultDownloadSourceInput.value,
    downloadSource,
    hostInput.value,
    nameInput.value,
    notifications.toasts,
    onSuccess,
    proxyIdInput.value,
    sslCertificateAuthoritiesInput.value,
    sslCertificateInput.value,
    sslKeyInput.value,
    sslKeySecretInput.value,
    validate,
  ]);

  return {
    inputs,
    submit,
    isLoading,
    isDisabled: isLoading || (downloadSource && !hasChanged) || isEditDisabled,
  };
}

function validateName(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.nameIsRequiredErrorMessage', {
        defaultMessage: 'Name is required',
      }),
    ];
  }
}

export function validateHost(value: string) {
  try {
    if (!value) {
      return [
        i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.HostIsRequiredErrorMessage', {
          defaultMessage: 'Host is required',
        }),
      ];
    }
    const urlParsed = new URL(value);
    if (!['http:', 'https:'].includes(urlParsed.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch (error) {
    return [
      i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.hostError', {
        defaultMessage: 'Invalid URL',
      }),
    ];
  }
}
