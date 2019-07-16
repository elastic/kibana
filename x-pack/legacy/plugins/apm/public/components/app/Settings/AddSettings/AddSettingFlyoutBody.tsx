/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
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
import { i18n } from '@kbn/i18n';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { Config } from '../SettingsList';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../common/environment_filter_values';

export function AddSettingFlyoutBody({
  selectedConfig,
  onDelete,
  environment,
  setEnvironment,
  serviceName,
  setServiceName,
  sampleRate,
  setSampleRate,
  serviceNames,
  serviceNamesStatus,
  environments,
  environmentStatus,
  isSampleRateValid,
  isSelectedEnvironmentValid
}: {
  selectedConfig: Config | null;
  onDelete: () => void;
  environment?: string;
  setEnvironment: React.Dispatch<React.SetStateAction<string | undefined>>;
  serviceName?: string;
  setServiceName: React.Dispatch<React.SetStateAction<string | undefined>>;
  sampleRate: number;
  setSampleRate: React.Dispatch<React.SetStateAction<number>>;
  serviceNames: string[];
  serviceNamesStatus?: FETCH_STATUS;
  environments: Array<{
    name: string;
    available: boolean;
  }>;
  environmentStatus?: FETCH_STATUS;
  isSampleRateValid: boolean;
  isSelectedEnvironmentValid: boolean;
}) {
  const environmentOptions = environments.map(({ name, available }) => ({
    disabled: !available,
    text:
      name === ENVIRONMENT_NOT_DEFINED
        ? i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.serviceEnvironmentNotSetOptionLabel',
            {
              defaultMessage: 'Not set'
            }
          )
        : name,
    value: name
  }));

  return (
    <EuiForm>
      <form>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate(
              'xpack.apm.settings.agentConf.flyOut.serviceSectionTitle',
              {
                defaultMessage: 'Service'
              }
            )}
          </h3>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.serviceNameSelectLabel',
            {
              defaultMessage: 'Name'
            }
          )}
          helpText={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.serviceNameSelectHelpText',
            {
              defaultMessage: 'Choose the service you want to configure.'
            }
          )}
        >
          <EuiSelect
            isLoading={serviceNamesStatus === 'loading'}
            hasNoInitialSelection
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
          label={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.serviceEnvironmentSelectLabel',
            {
              defaultMessage: 'Environment'
            }
          )}
          helpText={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.serviceEnvironmentSelectHelpText',
            {
              defaultMessage:
                'Only a single environment per configuration is supported.'
            }
          )}
          error={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.serviceEnvironmentSelectErrorText',
            {
              defaultMessage:
                'Must select a valid environment to save a configuration.'
            }
          )}
          isInvalid={
            !(
              selectedConfig ||
              (!selectedConfig &&
                environment &&
                isSelectedEnvironmentValid &&
                environmentStatus === 'success') ||
              isNaN(sampleRate)
            )
          }
        >
          <EuiSelect
            key={serviceName} // rerender when serviceName changes to mitigate initial selection bug in EuiSelect
            isLoading={environmentStatus === 'loading'}
            hasNoInitialSelection
            options={environmentOptions}
            value={environment}
            disabled={!serviceName || Boolean(selectedConfig)}
            onChange={e => {
              e.preventDefault();
              setEnvironment(e.target.value);
            }}
          />
        </EuiFormRow>

        <EuiTitle size="xs">
          <h3>
            {i18n.translate(
              'xpack.apm.settings.agentConf.flyOut.configurationSectionTitle',
              {
                defaultMessage: 'Configuration'
              }
            )}
          </h3>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.sampleRateConfigurationInputLabel',
            {
              defaultMessage: 'Transaction sample rate'
            }
          )}
          helpText={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.sampleRateConfigurationInputHelpText',
            {
              defaultMessage:
                'Choose a rate between 0.000 and 1.0. Default configuration is 1.0 (100% of traces).'
            }
          )}
          error={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.sampleRateConfigurationInputErrorText',
            {
              defaultMessage: 'Sample rate must be between 0.000 and 1'
            }
          )}
          isInvalid={
            !(
              (Boolean(selectedConfig) &&
                (isNaN(sampleRate) || isSampleRateValid)) ||
              (!selectedConfig &&
                (!(serviceName || environment) ||
                  (isNaN(sampleRate) || isSampleRateValid)))
            )
          }
        >
          <EuiFieldNumber
            min={0}
            max={1}
            step={0.001}
            placeholder={i18n.translate(
              'xpack.apm.settings.agentConf.flyOut.sampleRateConfigurationInputPlaceholderText',
              {
                defaultMessage: 'Set sample rate'
              }
            )}
            value={isNaN(sampleRate) ? '' : sampleRate}
            onChange={e => {
              e.preventDefault();
              setSampleRate(parseFloat(e.target.value));
            }}
          />
        </EuiFormRow>

        {selectedConfig ? (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiTitle size="xs">
              <h3>
                <EuiText color="danger">
                  {i18n.translate(
                    'xpack.apm.settings.agentConf.flyOut.deleteConfigurationSectionTitle',
                    {
                      defaultMessage: 'Delete configuration'
                    }
                  )}
                </EuiText>
              </h3>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                {i18n.translate(
                  'xpack.apm.settings.agentConf.flyOut.deleteConfigurationSectionText',
                  {
                    defaultMessage:
                      'If you wish to delete this configuration, please be aware that the agents will continue to use the existing configuration until they sync with the APM Server.'
                  }
                )}
              </p>
            </EuiText>

            <EuiSpacer size="s" />

            <EuiButton fill={false} color="danger" onClick={onDelete}>
              {i18n.translate(
                'xpack.apm.settings.agentConf.flyOut.deleteConfigurationButtonLabel',
                {
                  defaultMessage: 'Delete'
                }
              )}
            </EuiButton>

            <EuiSpacer size="m" />
          </>
        ) : null}
      </form>
    </EuiForm>
  );
}
