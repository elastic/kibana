/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// copy this one
import React, { useCallback, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  sendPostFleetServerHost,
  sendPutFleetServerHost,
  useAuthz,
  useComboInput,
  useInput,
  useStartServices,
  useSwitchInput,
  validateInputs,
} from '../../../../hooks';
import { isDiffPathProtocol } from '../../../../../../../common/services';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import type { FleetServerHost } from '../../../../types';

const URL_REGEX = /^(https):\/\/[^\s$.?#].[^\s]*$/gm;

const ConfirmTitle = () => (
  <FormattedMessage
    id="xpack.fleet.settings.fleetServerHostsFlyout.confirmModalTitle"
    defaultMessage="Save and deploy changes?"
  />
);

const ConfirmDescription: React.FunctionComponent = ({}) => (
  <FormattedMessage
    id="xpack.fleet.settings.fleetServerHostsFlyout.confirmModalText"
    defaultMessage="This action will update agent policies enrolled in this Fleet Server. This action can not be undone. Are you sure you wish to continue?"
  />
);

export function validateFleetServerHosts(value: string[]) {
  if (value.length === 0) {
    return [
      {
        message: i18n.translate('xpack.fleet.settings.fleetServerHostsEmptyError', {
          defaultMessage: 'At least one URL is required',
        }),
      },
    ];
  }

  const res: Array<{ message: string; index: number }> = [];
  const hostIndexes: { [key: string]: number[] } = {};
  value.forEach((val, idx) => {
    if (!val) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.fleetServerHostsRequiredError', {
          defaultMessage: 'Host URL is required',
        }),
        index: idx,
      });
    } else if (!val.match(URL_REGEX)) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.fleetServerHostsError', {
          defaultMessage: 'Invalid URL (must be an https URL)',
        }),
        index: idx,
      });
    }
    const curIndexes = hostIndexes[val] || [];
    hostIndexes[val] = [...curIndexes, idx];
  });

  Object.values(hostIndexes)
    .filter(({ length }) => length > 1)
    .forEach((indexes) => {
      indexes.forEach((index) =>
        res.push({
          message: i18n.translate('xpack.fleet.settings.fleetServerHostsDuplicateError', {
            defaultMessage: 'Duplicate URL',
          }),
          index,
        })
      );
    });

  if (res.length) {
    return res;
  }

  if (value.length && isDiffPathProtocol(value)) {
    return [
      {
        message: i18n.translate(
          'xpack.fleet.settings.fleetServerHostsDifferentPathOrProtocolError',
          {
            defaultMessage: 'Protocol and path must be the same for each URL',
          }
        ),
      },
    ];
  }
}

export function validateName(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.fleetServerHost.nameIsRequiredErrorMessage', {
        defaultMessage: 'Name is required',
      }),
    ];
  }
}

export function useFleetServerHostsForm(
  fleetServerHost: FleetServerHost | undefined,
  onSuccess: () => void,
  defaultFleetServerHost?: FleetServerHost
) {
  const [isLoading, setIsLoading] = useState(false);
  const { notifications, cloud } = useStartServices();
  const authz = useAuthz();
  const { confirm } = useConfirmModal();
  const isEditDisabled = (fleetServerHost?.is_preconfigured || !authz.fleet.allSettings) ?? false;

  const nameInput = useInput(fleetServerHost?.name ?? '', validateName, isEditDisabled);
  const isDefaultInput = useSwitchInput(
    fleetServerHost?.is_default ?? false,
    isEditDisabled || fleetServerHost?.is_default
  );

  const isServerless = cloud?.isServerlessEnabled;
  // Set the host URLs to default for new Fleet server host in serverless.
  const hostUrlsDefaultValue =
    isServerless && !fleetServerHost?.host_urls
      ? defaultFleetServerHost?.host_urls || []
      : fleetServerHost?.host_urls || [];
  const hostUrlsDisabled = isEditDisabled || isServerless;
  const hostUrlsInput = useComboInput(
    'hostUrls',
    hostUrlsDefaultValue,
    validateFleetServerHosts,
    hostUrlsDisabled
  );
  const proxyIdInput = useInput(fleetServerHost?.proxy_id ?? '', () => undefined, isEditDisabled);

  const certificateAuthoritiesInput = useInput(
    fleetServerHost?.certificate_authorities ?? '',
    () => undefined,
    isEditDisabled
  );
  const certificateInput = useInput(
    fleetServerHost?.certificate ?? '',
    () => undefined,
    isEditDisabled
  );
  const certificateKeyInput = useInput(
    fleetServerHost?.certificate_key ?? '',
    () => undefined,
    isEditDisabled
  );
  const esCertificateAuthoritiesInput = useInput(
    fleetServerHost?.es_certificate_authorities ?? '',
    () => undefined,
    isEditDisabled
  );
  const esCertificateInput = useInput(
    fleetServerHost?.es_certificate ?? '',
    () => undefined,
    isEditDisabled
  );
  const esCertificateKeyInput = useInput(
    fleetServerHost?.es_certificate_key ?? '',
    () => undefined,
    isEditDisabled
  );

  const inputs = useMemo(
    () => ({
      nameInput,
      isDefaultInput,
      hostUrlsInput,
      proxyIdInput,
      certificateAuthoritiesInput,
      certificateInput,
      certificateKeyInput,
      esCertificateAuthoritiesInput,
      esCertificateInput,
      esCertificateKeyInput,
    }),
    [
      nameInput,
      isDefaultInput,
      hostUrlsInput,
      proxyIdInput,
      certificateAuthoritiesInput,
      certificateInput,
      certificateKeyInput,
      esCertificateAuthoritiesInput,
      esCertificateInput,
      esCertificateKeyInput,
    ]
  );

  const validate = useCallback(() => validateInputs(inputs), [inputs]);

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      if (!(await confirm(<ConfirmTitle />, <ConfirmDescription />))) {
        return;
      }
      setIsLoading(true);
      const data = {
        name: nameInput.value,
        host_urls: hostUrlsInput.value,
        is_default: isDefaultInput.value,
        proxy_id: proxyIdInput.value !== '' ? proxyIdInput.value : null,
        certificate_authorities: certificateAuthoritiesInput.value,
        certificate: certificateInput.value,
        certificate_key: certificateKeyInput.value,
        es_certificate_authorities: esCertificateAuthoritiesInput.value,
        es_certificate: esCertificateInput.value,
        es_certificate_key: esCertificateKeyInput.value,
      };
      if (fleetServerHost) {
        const res = await sendPutFleetServerHost(fleetServerHost.id, data);
        if (res.error) {
          throw res.error;
        }
      } else {
        const res = await sendPostFleetServerHost(data);
        if (res.error) {
          throw res.error;
        }
      }
      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.settings.fleetServerHostsFlyout.successToastTitle', {
          defaultMessage: 'Fleet Server host saved',
        })
      );
      setIsLoading(false);
      await onSuccess();
    } catch (error) {
      setIsLoading(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.settings.fleetServerHostsFlyout.errorToastTitle', {
          defaultMessage: 'An error happened while saving Fleet Server host',
        }),
      });
    }
  }, [
    validate,
    confirm,
    nameInput.value,
    hostUrlsInput.value,
    isDefaultInput.value,
    proxyIdInput.value,
    certificateAuthoritiesInput.value,
    certificateInput.value,
    certificateKeyInput.value,
    esCertificateAuthoritiesInput.value,
    esCertificateInput.value,
    esCertificateKeyInput.value,
    fleetServerHost,
    notifications.toasts,
    onSuccess,
  ]);

  const hasChanged = Object.values(inputs).some((input) => input.hasChanged);

  const isDisabled =
    isEditDisabled ||
    isLoading ||
    !hasChanged ||
    hostUrlsInput.props.isInvalid ||
    nameInput.props.isInvalid;

  return {
    isLoading,
    isDisabled,
    submit,
    inputs,
  };
}
