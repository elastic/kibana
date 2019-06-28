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
  EuiFieldNumber,
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
  EuiText
} from '@elastic/eui';
import { isEmpty, isNumber } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  loadCMServices,
  loadCMEnvironments,
  saveCMConfiguration,
  updateCMConfiguration,
  deleteCMConfiguration
} from '../../../../services/rest/apm/settings';
import { useFetcher } from '../../../../hooks/useFetcher';
import { Config } from '../ListSettings';

const ENVIRONMENT_NOT_SET = 'ENVIRONMENT_NOT_SET';

export function AddSettingFlyoutBody({
  selectedConfig,
  onSubmit
}: {
  selectedConfig: Config | null;
  onSubmit: () => void;
}) {
  const [environment, setEnvironment] = useState<string | undefined>(
    selectedConfig ? selectedConfig.service.environment : undefined
  );
  const [serviceName, setServiceName] = useState<string | undefined>(
    selectedConfig ? selectedConfig.service.name : undefined
  );
  const [sampleRate, setSampleRate] = useState<number | string>(
    selectedConfig ? parseFloat(selectedConfig.settings.sample_rate) : ''
  );
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
      if (!isEmpty(serviceNames) && !serviceName) {
        setServiceName(serviceNames[0]);
      }
    },
    [serviceNames]
  );

  useEffect(
    () => {
      if (!isEmpty(environments) && !environment) {
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
          await saveConfig({
            environment,
            serviceName,
            sampleRate,
            configurationId: selectedConfig ? selectedConfig.id : undefined
          });
          onSubmit();
        }}
      >
        <EuiTitle size="xs">
          <h3>Service</h3>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow
          label="Name"
          helpText="Choose the service you want to configure."
        >
          <EuiSelect
            isLoading={serviceNamesStatus === 'loading'}
            options={serviceNames.map(text => ({ text }))}
            value={serviceName}
            disabled={Boolean(selectedConfig)}
            onChange={e => {
              e.preventDefault();
              setServiceName(e.target.value);
              setEnvironment(undefined);
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label="Environment"
          helpText="Only a single environment per configuration is supported."
          error={
            'A configuration for the selected service name and environment already exists.'
          }
          isInvalid={
            !selectedConfig &&
            (environment != null &&
              !isSelectedEnvironmentValid &&
              (environmentStatus === 'success' ||
                environmentStatus === 'failure'))
          }
        >
          <EuiSelect
            isLoading={environmentStatus === 'loading'}
            options={environmentOptions}
            value={environment}
            disabled={Boolean(selectedConfig)}
            onChange={e => {
              e.preventDefault();
              setEnvironment(e.target.value);
            }}
          />
        </EuiFormRow>

        <EuiTitle size="xs">
          <h3>Configuration</h3>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow
          label="Transaction sample rate"
          helpText="Choose a rate between 0.00 and 1.0. Default configuration is 1.0 (100% of traces)."
          error={'Sample rate must be between 0.00 and 1'}
          isInvalid={isSampleRateValid}
        >
          <EuiFieldNumber
            min={0}
            max={1}
            step={0.001}
            placeholder="Set sample rate"
            value={sampleRate}
            onChange={e => {
              e.preventDefault();
              const parsedValue = parseFloat(e.target.value);

              setSampleRate(isNaN(parsedValue) ? '' : parsedValue);
            }}
          />
        </EuiFormRow>

        {selectedConfig ? (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiTitle size="xs">
              <h3>
                <EuiText color="danger">Delete configuration</EuiText>
              </h3>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                If you wish to delete this configuration, please be aware that
                the agents will continue to use the existing configuration until
                they sync with the APM Server.
              </p>
            </EuiText>

            <EuiSpacer size="s" />

            <EuiButton
              fill={false}
              color="danger"
              onClick={async () => {
                await deleteConfig(selectedConfig.id);
                onSubmit();
              }}
            >
              Delete
            </EuiButton>

            <EuiSpacer size="m" />
          </>
        ) : null}

        <EuiFormRow>
          {/* TODO: Move to AddSettingFlyout EuiFlyoutFooter instead */}
          <EuiButton
            type="submit"
            fill
            disabled={
              serviceName == null ||
              sampleRate == null ||
              sampleRate === '' ||
              environment == null ||
              !(selectedConfig || isSelectedEnvironmentValid) ||
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

async function deleteConfig(configurationId: string) {
  try {
    await deleteCMConfiguration(configurationId);

    toastNotifications.addSuccess({
      title: i18n.translate('xpack.apm.settings.cm.deleteConfigSucceeded', {
        defaultMessage: 'Config was deleted'
      })
    });
  } catch (error) {
    toastNotifications.addDanger({
      title: i18n.translate('xpack.apm.settings.cm.deleteConfigFailed', {
        defaultMessage: 'Config could not be deleted'
      })
    });
  }
}

async function saveConfig({
  sampleRate,
  serviceName,
  environment,
  configurationId
}: {
  sampleRate: number | string;
  serviceName: string | undefined;
  environment: string | undefined;
  configurationId?: string;
}) {
  try {
    if (!isNumber(sampleRate) || !serviceName) {
      throw new Error('Missing arguments');
    }

    const configuration = {
      settings: {
        sample_rate: sampleRate.toString(10)
      },
      service: {
        name: serviceName,
        environment:
          environment === ENVIRONMENT_NOT_SET ? undefined : environment
      }
    };

    if (configurationId) {
      await updateCMConfiguration(configurationId, configuration);
      toastNotifications.addSuccess({
        title: i18n.translate('xpack.apm.settings.cm.editConfigSucceeded', {
          defaultMessage: 'Config was edited'
        })
      });
    } else {
      await saveCMConfiguration(configuration);
      toastNotifications.addSuccess({
        title: i18n.translate('xpack.apm.settings.cm.createConfigSucceeded', {
          defaultMessage: 'Config was created'
        })
      });
    }
  } catch (error) {
    toastNotifications.addDanger({
      title: i18n.translate('xpack.apm.settings.cm.createConfigFailed', {
        defaultMessage: 'Config could not be created'
      })
    });
  }
}
