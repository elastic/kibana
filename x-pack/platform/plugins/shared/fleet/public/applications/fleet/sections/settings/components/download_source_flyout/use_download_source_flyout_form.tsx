/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { useSecretInput, useComboInput, useRadioInput, useKeyValueInput } from '../../../../hooks';
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

export type AuthType = 'none' | 'username_password' | 'api_key';

export interface DownloadSourceFormInputsType {
  nameInput: ReturnType<typeof useInput>;
  defaultDownloadSourceInput: ReturnType<typeof useSwitchInput>;
  hostInput: ReturnType<typeof useInput>;
  proxyIdInput: ReturnType<typeof useInput>;
  sslCertificateInput: ReturnType<typeof useInput>;
  sslKeyInput: ReturnType<typeof useInput>;
  sslKeySecretInput: ReturnType<typeof useSecretInput>;
  sslCertificateAuthoritiesInput: ReturnType<typeof useComboInput>;
  authTypeInput: ReturnType<typeof useRadioInput>;
  usernameInput: ReturnType<typeof useInput>;
  passwordInput: ReturnType<typeof useInput>;
  passwordSecretInput: ReturnType<typeof useSecretInput>;
  apiKeyInput: ReturnType<typeof useInput>;
  apiKeySecretInput: ReturnType<typeof useSecretInput>;
  headersInput: ReturnType<typeof useKeyValueInput>;
}

function getInitialAuthType(downloadSource?: DownloadSource): AuthType {
  if (!downloadSource) return 'none';
  const ds = downloadSource as DownloadSourceBase;
  if (ds.auth?.api_key || ds.secrets?.auth?.api_key) return 'api_key';
  if (ds.auth?.username || ds.auth?.password || ds.secrets?.auth?.password) {
    return 'username_password';
  }
  return 'none';
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

  // Auth inputs
  const authTypeInput = useRadioInput(getInitialAuthType(downloadSource), isEditDisabled);
  const usernameInput = useInput(
    (downloadSource as DownloadSourceBase)?.auth?.username ?? '',
    undefined,
    isEditDisabled
  );
  const passwordInput = useInput(
    (downloadSource as DownloadSourceBase)?.auth?.password ?? '',
    undefined,
    isEditDisabled
  );
  const passwordSecretInput = useSecretInput(
    (downloadSource as DownloadSourceBase)?.secrets?.auth?.password,
    undefined,
    isEditDisabled
  );
  const apiKeyInput = useInput(
    (downloadSource as DownloadSourceBase)?.auth?.api_key ?? '',
    undefined,
    isEditDisabled
  );
  const apiKeySecretInput = useSecretInput(
    (downloadSource as DownloadSourceBase)?.secrets?.auth?.api_key,
    undefined,
    isEditDisabled
  );

  const headersInput = useKeyValueInput(
    'downloadSourceHeadersInput',
    (downloadSource as DownloadSourceBase)?.auth?.headers ?? [{ key: '', value: '' }],
    validateDownloadSourceHeaders,
    isEditDisabled
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
    authTypeInput,
    usernameInput,
    passwordInput,
    passwordSecretInput,
    apiKeyInput,
    apiKeySecretInput,
    headersInput,
  };

  const hasChanged = Object.values(inputs).some((input) => input.hasChanged);

  const validate = useCallback(() => {
    const nameInputValid = nameInput.validate();
    const hostValid = hostInput.validate();

    const sslCertificateValid = sslCertificateInput.validate();
    const sslKeyValid = sslKeyInput.validate();
    const sslKeySecretValid = sslKeySecretInput.validate();

    const usernameValid = usernameInput.validate();
    const passwordValid = passwordInput.validate();
    const passwordSecretValid = passwordSecretInput.validate();
    const apiKeyValid = apiKeyInput.validate();
    const apiKeySecretValid = apiKeySecretInput.validate();
    const headersValid = headersInput.validate();

    // Validate auth credentials based on selected auth type
    const authType = authTypeInput.value as AuthType;
    let authValid = true;
    if (authType === 'username_password') {
      // Username & password tab: require both username and password
      const hasUsername = !!usernameInput.value;
      const hasPassword = !!passwordInput.value || !!passwordSecretInput.value;
      if (!hasUsername) {
        usernameInput.setErrors([
          i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.usernameRequired', {
            defaultMessage: 'Username is required',
          }),
        ]);
        authValid = false;
      }
      if (!hasPassword) {
        const passwordRequiredError = [
          i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.passwordRequired', {
            defaultMessage: 'Password is required',
          }),
        ];
        passwordInput.setErrors(passwordRequiredError);
        passwordSecretInput.setErrors(passwordRequiredError);
        authValid = false;
      }
    } else if (authType === 'api_key') {
      // API key tab: require api_key
      const hasApiKey = !!apiKeyInput.value || !!apiKeySecretInput.value;
      if (!hasApiKey) {
        const apiKeyRequiredError = [
          i18n.translate('xpack.fleet.settings.dowloadSourceFlyoutForm.apiKeyRequired', {
            defaultMessage: 'API key is required',
          }),
        ];
        apiKeyInput.setErrors(apiKeyRequiredError);
        apiKeySecretInput.setErrors(apiKeyRequiredError);
        authValid = false;
      }
    }

    return (
      nameInputValid &&
      hostValid &&
      sslCertificateValid &&
      sslKeyValid &&
      sslKeySecretValid &&
      usernameValid &&
      passwordValid &&
      passwordSecretValid &&
      apiKeyValid &&
      apiKeySecretValid &&
      headersValid &&
      authValid
    );
  }, [
    nameInput,
    hostInput,
    sslCertificateInput,
    sslKeyInput,
    sslKeySecretInput,
    usernameInput,
    passwordInput,
    passwordSecretInput,
    apiKeyInput,
    apiKeySecretInput,
    headersInput,
    authTypeInput.value,
  ]);

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      setIsloading(true);

      const authType = authTypeInput.value as AuthType;
      let auth: PostDownloadSourceRequest['body']['auth'] | null;

      const filteredHeaders = headersInput.value.filter(
        (header) => header.key !== '' || header.value !== ''
      );
      const hasHeaders = filteredHeaders.length > 0;

      if (authType === 'none') {
        // None tab: headers only or clear all auth
        auth = hasHeaders ? { headers: filteredHeaders } : null;
      } else if (authType === 'username_password') {
        auth = {
          username: usernameInput.value || undefined,
          password: passwordInput.value || undefined,
          headers: hasHeaders ? filteredHeaders : undefined,
        };
      } else if (authType === 'api_key') {
        auth = {
          api_key: apiKeyInput.value || undefined,
          headers: hasHeaders ? filteredHeaders : undefined,
        };
      } else {
        auth = null;
      }

      const sslSecrets =
        !sslKeyInput.value && sslKeySecretInput.value
          ? { key: sslKeySecretInput.value }
          : undefined;

      let authSecrets:
        | { password?: string | { id: string }; api_key?: string | { id: string } }
        | undefined;
      if (authType === 'username_password' && !passwordInput.value && passwordSecretInput.value) {
        authSecrets = { password: passwordSecretInput.value };
      } else if (authType === 'api_key' && !apiKeyInput.value && apiKeySecretInput.value) {
        authSecrets = { api_key: apiKeySecretInput.value };
      }

      const secrets =
        sslSecrets || authSecrets
          ? {
              ...(sslSecrets && { ssl: sslSecrets }),
              ...(authSecrets && { auth: authSecrets }),
            }
          : undefined;

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
        auth,
        ...(secrets && { secrets }),
      };

      if (downloadSource) {
        if (!(await confirmUpdate(downloadSource, confirm))) {
          setIsloading(false);
          return;
        }

        const res = await sendPutDownloadSource(downloadSource.id, data);
        if (res.error) {
          throw res.error;
        }
      } else {
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
    authTypeInput.value,
    usernameInput.value,
    passwordInput.value,
    passwordSecretInput.value,
    apiKeyInput.value,
    apiKeySecretInput.value,
    headersInput.value,
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

export function validateDownloadSourceHeaders(pairs: Array<{ key: string; value: string }>) {
  const errors: Array<{
    message: string;
    index: number;
    hasKeyError: boolean;
    hasValueError: boolean;
  }> = [];

  const existingKeys: Set<string> = new Set();

  pairs.forEach((pair, index) => {
    const { key, value } = pair;

    const hasKey = !!key;
    const hasValue = !!value;

    if (hasKey && !hasValue) {
      errors.push({
        message: i18n.translate(
          'xpack.fleet.settings.dowloadSourceFlyoutForm.headersMissingValueError',
          {
            defaultMessage: 'Missing value for key "{key}"',
            values: { key },
          }
        ),
        index,
        hasKeyError: false,
        hasValueError: true,
      });
    } else if (!hasKey && hasValue) {
      errors.push({
        message: i18n.translate(
          'xpack.fleet.settings.dowloadSourceFlyoutForm.headersMissingKeyError',
          {
            defaultMessage: 'Missing key for value "{value}"',
            values: { value },
          }
        ),
        index,
        hasKeyError: true,
        hasValueError: false,
      });
    } else if (hasKey && hasValue) {
      if (existingKeys.has(key)) {
        errors.push({
          message: i18n.translate(
            'xpack.fleet.settings.dowloadSourceFlyoutForm.headersDuplicateKeyError',
            {
              defaultMessage: 'Duplicate key "{key}"',
              values: { key },
            }
          ),
          index,
          hasKeyError: true,
          hasValueError: false,
        });
      } else {
        existingKeys.add(key);
      }
    }
  });
  if (errors.length) {
    return errors;
  }
}
