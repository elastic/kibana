/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiTitle,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut
} from '@elastic/eui';
import React, { useState } from 'react';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AddSettingFlyoutBody } from './AddSettingFlyoutBody';
import { Config } from '../SettingsList';
import { useFetcher } from '../../../../hooks/useFetcher';
import {
  loadCMServices,
  loadCMEnvironments,
  deleteCMConfiguration,
  updateCMConfiguration,
  createCMConfiguration
} from '../../../../services/rest/apm/settings';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../common/environment_filter_values';

interface Props {
  onClose: () => void;
  onSubmit: () => void;
  isOpen: boolean;
  selectedConfig: Config | null;
}

export function AddSettingsFlyout({
  onClose,
  isOpen,
  onSubmit,
  selectedConfig
}: Props) {
  if (!isOpen) {
    return null;
  }

  const [environment, setEnvironment] = useState<string | undefined>(
    selectedConfig
      ? selectedConfig.service.environment || ENVIRONMENT_NOT_DEFINED
      : undefined
  );
  const [serviceName, setServiceName] = useState<string | undefined>(
    selectedConfig ? selectedConfig.service.name : undefined
  );
  const [sampleRate, setSampleRate] = useState<number>(
    selectedConfig ? parseFloat(selectedConfig.settings.sample_rate) : NaN
  );
  const { data: serviceNames = [], status: serviceNamesStatus } = useFetcher<
    string[]
  >(async () => (await loadCMServices()).sort(), [], {
    preservePreviousResponse: false
  });
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
  const isSelectedEnvironmentValid = environments.some(
    env =>
      env.name === environment && (Boolean(selectedConfig) || env.available)
  );
  const isSampleRateValid = sampleRate >= 0 && sampleRate <= 1;

  return (
    <EuiPortal>
      <EuiFlyout size="s" onClose={onClose} ownFocus={true}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            {selectedConfig ? (
              <h2>
                {i18n.translate(
                  'xpack.apm.settings.cm.flyOut.editConfigTitle',
                  {
                    defaultMessage: 'Edit configuration'
                  }
                )}
              </h2>
            ) : (
              <h2>
                {i18n.translate(
                  'xpack.apm.settings.cm.flyOut.createConfigTitle',
                  {
                    defaultMessage: 'Create configuration'
                  }
                )}
              </h2>
            )}
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiCallOut
            title={i18n.translate(
              'xpack.apm.settings.cm.flyOut.betaCallOutTitle',
              {
                defaultMessage: 'APM Agent Configuration (BETA)'
              }
            )}
            iconType="iInCircle"
            color="warning"
          >
            {i18n.translate('xpack.apm.settings.cm.flyOut.betaCallOutText', {
              defaultMessage:
                'Please note only sample rate configuration is supported in this first version. We will extend support for central configuration in future releases. Please be aware of bugs.'
            })}
          </EuiCallOut>
          <EuiHorizontalRule margin="m" />
          <AddSettingFlyoutBody
            selectedConfig={selectedConfig}
            onDelete={async () => {
              if (selectedConfig) {
                await deleteConfig(selectedConfig);
              }
              onSubmit();
            }}
            environment={environment}
            setEnvironment={setEnvironment}
            serviceName={serviceName}
            setServiceName={setServiceName}
            sampleRate={sampleRate}
            setSampleRate={setSampleRate}
            serviceNames={serviceNames}
            serviceNamesStatus={serviceNamesStatus}
            environments={environments}
            environmentStatus={environmentStatus}
            isSampleRateValid={isSampleRateValid}
            isSelectedEnvironmentValid={isSelectedEnvironmentValid}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>
                {i18n.translate(
                  'xpack.apm.settings.cm.flyOut.cancelButtonLabel',
                  {
                    defaultMessage: 'Cancel'
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={
                  !(
                    (selectedConfig && isSampleRateValid) ||
                    (!selectedConfig &&
                      serviceName &&
                      environment &&
                      isSelectedEnvironmentValid &&
                      isSampleRateValid)
                  )
                }
                onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  await saveConfig({
                    environment,
                    serviceName,
                    sampleRate,
                    configurationId: selectedConfig
                      ? selectedConfig.id
                      : undefined
                  });
                  onSubmit();
                }}
              >
                {i18n.translate(
                  'xpack.apm.settings.cm.flyOut.saveConfigurationButtonLabel',
                  {
                    defaultMessage: 'Save configuration'
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
}
async function deleteConfig(selectedConfig: Config) {
  try {
    await deleteCMConfiguration(selectedConfig.id);
    toastNotifications.addSuccess({
      title: i18n.translate(
        'xpack.apm.settings.cm.deleteConfigSucceededTitle',
        {
          defaultMessage: 'Configuration was deleted'
        }
      ),
      text: (
        <FormattedMessage
          id="xpack.apm.settings.cm.deleteConfigSucceededText"
          defaultMessage="You have successfully deleted a configuration for {serviceName}. It will take some time to propagate to the agents."
          values={{
            serviceName: `"${selectedConfig.service.name}"`
          }}
        />
      )
    });
  } catch (error) {
    toastNotifications.addDanger({
      title: i18n.translate('xpack.apm.settings.cm.deleteConfigFailedTitle', {
        defaultMessage: 'Configuration could not be deleted'
      }),
      text: (
        <FormattedMessage
          id="xpack.apm.settings.cm.deleteConfigFailedText"
          defaultMessage="Something went wrong when deleting a configuration for {serviceName}. Error: {errorMessage}"
          values={{
            serviceName: `"${selectedConfig.service.name}"`,
            errorMessage: `"${error.message}"`
          }}
        />
      )
    });
  }
}

async function saveConfig({
  sampleRate,
  serviceName,
  environment,
  configurationId
}: {
  sampleRate: number;
  serviceName: string | undefined;
  environment: string | undefined;
  configurationId?: string;
}) {
  try {
    if (isNaN(sampleRate) || !serviceName) {
      throw new Error('Missing arguments');
    }

    const configuration = {
      settings: {
        sample_rate: sampleRate.toString(10)
      },
      service: {
        name: serviceName,
        environment:
          environment === ENVIRONMENT_NOT_DEFINED ? undefined : environment
      }
    };

    if (configurationId) {
      await updateCMConfiguration(configurationId, configuration);
      toastNotifications.addSuccess({
        title: i18n.translate(
          'xpack.apm.settings.cm.editConfigSucceededTitle',
          {
            defaultMessage: 'Configuration edited'
          }
        ),
        text: (
          <FormattedMessage
            id="xpack.apm.settings.cm.editConfigSucceededText"
            defaultMessage="You have successfully edited the configuration for {serviceName}. It will take some time to propagate to the agents."
            values={{
              serviceName: `"${serviceName}"`
            }}
          />
        )
      });
    } else {
      await createCMConfiguration(configuration);
      toastNotifications.addSuccess({
        title: i18n.translate(
          'xpack.apm.settings.cm.createConfigSucceededTitle',
          {
            defaultMessage: 'Configuration created!'
          }
        ),
        text: (
          <FormattedMessage
            id="xpack.apm.settings.cm.createConfigSucceededText"
            defaultMessage="You have successfully created a configuration for {serviceName}. It will take some time to propagate to the agents."
            values={{
              serviceName: `"${serviceName}"`
            }}
          />
        )
      });
    }
  } catch (error) {
    if (configurationId) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.apm.settings.cm.editConfigFailedTitle', {
          defaultMessage: 'Configuration could not be edited'
        }),
        text: (
          <FormattedMessage
            id="xpack.apm.settings.cm.editConfigFailedText"
            defaultMessage="Something went wrong when editing the configuration for {serviceName}. Error: {errorMessage}"
            values={{
              serviceName: `"${serviceName}"`,
              errorMessage: `"${error.message}"`
            }}
          />
        )
      });
    } else {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.apm.settings.cm.createConfigFailedTitle', {
          defaultMessage: 'Configuration could not be created'
        }),
        text: (
          <FormattedMessage
            id="xpack.apm.settings.cm.createConfigFailedText"
            defaultMessage="Something went wrong when creating a configuration for {serviceName}. Error: {errorMessage}"
            values={{
              serviceName: `"${serviceName}"`,
              errorMessage: `"${error.message}"`
            }}
          />
        )
      });
    }
  }
}
