/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { toastNotifications } from 'ui/notify';
import {
  EuiSelect,
  EuiForm,
  EuiFormRow,
  EuiButton,
  EuiFieldNumber
} from '@elastic/eui';
import { isEmpty, isNumber } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  loadCMServices,
  loadCMEnvironments,
  saveCMConfiguration
} from '../../../../services/rest/apm/settings';
import { useFetcher } from '../../../../hooks/useFetcher';

const ENVIRONMENT_NOT_SET = 'ENVIRONMENT_NOT_SET';

export function AddSettingFlyoutBody({ onSubmit }: { onSubmit: () => void }) {
  const [environment, setEnvironment] = useState<string | undefined>(undefined);
  const [serviceName, setServiceName] = useState<string | undefined>(undefined);
  const [sampleRate, setSampleRate] = useState<number | string>('');
  const { data: serviceNames = [], status: serviceNamesStatus } = useFetcher<
    string[]
  >(loadCMServices, [], { preservePreviousResponse: false });
  const { data: environments = [], status: environmentStatus } = useFetcher<
    Array<{ name: string; available: boolean }>
  >(
    () => {
      if (serviceName) {
        return loadCMEnvironments({ serviceName });
      }
    },
    [serviceName],
    { preservePreviousResponse: false }
  );

  useEffect(
    () => {
      if (!isEmpty(serviceNames)) {
        setServiceName(serviceNames[0]);
      }
    },
    [serviceNames]
  );

  useEffect(
    () => {
      if (!isEmpty(environments)) {
        setEnvironment(environments[0].name);
      }
    },
    [environments]
  );

  const environmentOptions = environments.map(({ name, available }) => ({
    disabled: !available,
    text: name === ENVIRONMENT_NOT_SET ? 'Not set' : name,
    value: name
  }));

  const isSelectedEnvironmentValid = environments.some(
    env => env.name === environment && env.available
  );
  const isSampleRateValid = sampleRate < 0 || sampleRate > 1;

  return (
    <EuiForm>
      <form
        onSubmit={async event => {
          event.preventDefault();
          await saveConfig({ environment, serviceName, sampleRate });
          onSubmit();
        }}
      >
        <EuiFormRow label="Service name">
          <EuiSelect
            isLoading={serviceNamesStatus === 'loading'}
            options={serviceNames.map(text => ({ text }))}
            value={serviceName}
            onChange={e => {
              e.preventDefault();
              setServiceName(e.target.value);
              setEnvironment(undefined);
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label="Service environment"
          error={
            'The selected environment is not allowed, because a configuration for the selected service name and environment already exists'
          }
          isInvalid={
            environment != null &&
            !isSelectedEnvironmentValid &&
            (environmentStatus === 'success' || environmentStatus === 'failure')
          }
        >
          <EuiSelect
            isLoading={environmentStatus === 'loading'}
            options={environmentOptions}
            value={environment}
            onChange={e => {
              e.preventDefault();
              setEnvironment(e.target.value);
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label="Transaction sample rate"
          error={'Sample rate must be between 0 and 1'}
          isInvalid={isSampleRateValid}
        >
          <EuiFieldNumber
            min={0}
            max={1}
            step={0.1}
            placeholder="Sample rate... (E.g. 0.2)"
            value={sampleRate}
            onChange={e => {
              e.preventDefault();
              const parsedValue = parseFloat(e.target.value);

              setSampleRate(isNaN(parsedValue) ? '' : parsedValue);
            }}
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiButton
            type="submit"
            fill
            disabled={
              serviceName == null ||
              sampleRate == null ||
              sampleRate === '' ||
              environment == null ||
              !isSelectedEnvironmentValid ||
              isSampleRateValid
            }
          >
            Save configuration
          </EuiButton>
        </EuiFormRow>

        {/* <p>serviceName: {serviceName}</p>
        <p>sampleRate: {sampleRate}</p>
        <p>env: {environment}</p> */}
      </form>
    </EuiForm>
  );
}

async function saveConfig({
  sampleRate,
  serviceName,
  environment
}: {
  sampleRate: number | string;
  serviceName: string | undefined;
  environment: string | undefined;
}) {
  try {
    if (!isNumber(sampleRate) || !serviceName) {
      throw new Error('Missing arguments');
    }

    const configuration = {
      settings: {
        sample_rate: sampleRate
      },
      service: {
        name: serviceName,
        environment:
          environment === ENVIRONMENT_NOT_SET ? undefined : environment
      }
    };

    await saveCMConfiguration(configuration);

    toastNotifications.addSuccess({
      title: i18n.translate('xpack.apm.settings.cm.createConfigSucceeded', {
        defaultMessage: 'Config was created'
      })
    });
  } catch (error) {
    toastNotifications.addDanger({
      title: i18n.translate('xpack.apm.settings.cm.createConfigFailed', {
        defaultMessage: 'Config could not be created'
      })
    });
  }
}
