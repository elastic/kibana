/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState, useMemo } from 'react';

import {
  sendPostFleetServerHost,
  useGetFleetServerHosts,
  useComboInput,
  useInput,
  useSwitchInput,
  validateInputs,
  useSecretInput,
  useRadioInput,
} from '../../../hooks';
import type { FleetServerHost } from '../../../types';

import type { FleetServerHostSSLInputsType } from '../../../sections/settings/components/fleet_server_hosts_flyout/use_fleet_server_host_form';
import {
  validateName,
  validateFleetServerHosts,
} from '../../../sections/settings/components/fleet_server_hosts_flyout/use_fleet_server_host_form';
import type { ClientAuth, NewFleetServerHost, ValueOf } from '../../../../../../common/types';
import { clientAuth } from '../../../../../../common/types';

export interface FleetServerHostForm {
  fleetServerHosts: FleetServerHost[];
  handleSubmitForm: () => Promise<FleetServerHost | undefined>;
  isFleetServerHostSubmitted: boolean;
  fleetServerHost?: FleetServerHost | null;
  setFleetServerHost: React.Dispatch<React.SetStateAction<FleetServerHost | undefined | null>>;
  error?: string;
  inputs: FleetServerHostSSLInputsType;
}

export const useFleetServerHost = (): FleetServerHostForm => {
  const [fleetServerHost, setFleetServerHost] = useState<FleetServerHost | null>();
  const [isFleetServerHostSubmitted, setIsFleetServerHostSubmitted] = useState<boolean>(false);

  const isPreconfigured = fleetServerHost?.is_preconfigured ?? false;
  const nameInput = useInput('', validateName, isPreconfigured);
  const isDefaultInput = useSwitchInput(false, isPreconfigured || fleetServerHost?.is_default);
  const hostUrlsInput = useComboInput('hostUrls', [], validateFleetServerHosts, isPreconfigured);

  const sslCertificateAuthoritiesInput = useComboInput(
    'sslCertificateAuthoritiesComboxBox',
    fleetServerHost?.ssl?.certificate_authorities ?? [],
    undefined,
    undefined
  );
  const sslCertificateInput = useInput(
    fleetServerHost?.ssl?.certificate ?? '',
    () => undefined,
    undefined
  );

  const sslEsCertificateAuthoritiesInput = useComboInput(
    'sslEsCertificateAuthoritiesComboxBox',
    fleetServerHost?.ssl?.es_certificate_authorities ?? [],
    undefined,
    undefined
  );
  const sslEsCertificateInput = useInput(
    fleetServerHost?.ssl?.es_certificate ?? '',
    () => undefined,
    undefined
  );

  const sslClientAuthInput = useRadioInput(
    fleetServerHost?.ssl?.client_auth ?? clientAuth.None,
    undefined
  );

  const sslKeyInput = useInput(fleetServerHost?.ssl?.key ?? '', undefined, undefined);
  const sslESKeyInput = useInput(fleetServerHost?.ssl?.es_key ?? '', undefined, undefined);

  const sslKeySecretInput = useSecretInput(
    (fleetServerHost as FleetServerHost)?.secrets?.ssl?.key,
    undefined,
    undefined
  );

  const sslESKeySecretInput = useSecretInput(
    (fleetServerHost as FleetServerHost)?.secrets?.ssl?.es_key,
    undefined,
    undefined
  );

  const inputs: FleetServerHostSSLInputsType = useMemo(
    () => ({
      nameInput,
      isDefaultInput,
      hostUrlsInput,
      sslCertificateAuthoritiesInput,
      sslCertificateInput,
      sslEsCertificateAuthoritiesInput,
      sslEsCertificateInput,
      sslKeyInput,
      sslESKeyInput,
      sslKeySecretInput,
      sslESKeySecretInput,
      sslClientAuthInput,
    }),
    [
      nameInput,
      isDefaultInput,
      hostUrlsInput,
      sslCertificateAuthoritiesInput,
      sslCertificateInput,
      sslEsCertificateAuthoritiesInput,
      sslEsCertificateInput,
      sslKeyInput,
      sslESKeyInput,
      sslKeySecretInput,
      sslESKeySecretInput,
      sslClientAuthInput,
    ]
  );

  const validate = useCallback(() => validateInputs({ ...inputs }), [inputs]);

  const { data, resendRequest: refreshGetFleetServerHosts } = useGetFleetServerHosts();

  const fleetServerHosts = useMemo(() => data?.items ?? [], [data?.items]);

  const setDefaultInputValue = isDefaultInput.setValue;
  useEffect(() => {
    const defaultHost = fleetServerHosts.find((item) => item.is_default === true);
    if (defaultHost) {
      setFleetServerHost(defaultHost);
      setDefaultInputValue(false);
    } else {
      setFleetServerHost(null);
      setDefaultInputValue(true);
    }
  }, [fleetServerHosts, setDefaultInputValue]);

  const handleSubmitForm = useCallback(async () => {
    if (!validate()) {
      return;
    }
    setIsFleetServerHostSubmitted(false);
    const newFleetServerHost: Partial<NewFleetServerHost> = {
      name: nameInput.value,
      host_urls: hostUrlsInput.value,
      is_default: isDefaultInput.value,
      ssl: {
        certificate: sslCertificateInput.value,
        key: sslKeyInput.value || undefined,
        certificate_authorities: sslCertificateAuthoritiesInput.value.filter((val) => val !== ''),
        es_certificate: sslEsCertificateInput.value,
        es_key: sslESKeyInput.value || undefined,
        es_certificate_authorities: sslEsCertificateAuthoritiesInput.value.filter(
          (val) => val !== ''
        ),
        ...(sslClientAuthInput.value !== clientAuth.None && {
          client_auth: sslClientAuthInput.value as ValueOf<ClientAuth>,
        }),
      },
      ...(((!sslKeyInput.value && sslKeySecretInput.value) ||
        (!sslESKeyInput.value && sslESKeySecretInput.value)) && {
        secrets: {
          ssl: {
            key: sslKeySecretInput.value || undefined,
            es_key: sslESKeySecretInput.value || undefined,
          },
        },
      }),
    };
    const res = await sendPostFleetServerHost(newFleetServerHost);
    if (res.error) {
      throw res.error;
    }
    if (!res.data) {
      throw new Error('No data');
    }

    await refreshGetFleetServerHosts();
    setIsFleetServerHostSubmitted(true);
    setFleetServerHost(res.data.item);

    return res.data.item;
  }, [
    validate,
    nameInput.value,
    hostUrlsInput.value,
    isDefaultInput.value,
    sslCertificateInput.value,
    sslKeyInput.value,
    sslCertificateAuthoritiesInput.value,
    sslEsCertificateInput.value,
    sslESKeyInput.value,
    sslEsCertificateAuthoritiesInput.value,
    sslClientAuthInput.value,
    sslKeySecretInput.value,
    sslESKeySecretInput.value,
    refreshGetFleetServerHosts,
  ]);

  return {
    fleetServerHosts,
    handleSubmitForm,
    fleetServerHost,
    isFleetServerHostSubmitted,
    setFleetServerHost,
    inputs,
  };
};
