/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';

import { ExperimentalFeaturesService } from '../../../../services';

import type { OutputFormInputsType } from './use_output_form';
import { SecretFormRow } from './output_form_secret_form_row';
import { SSLFormSection } from './ssl_form_section';

interface Props {
  inputs: OutputFormInputsType;
  useSecretsStorage: boolean;
  onToggleSecretStorage: (secretEnabled: boolean) => void;
}

export interface IsConvertedToSecret {
  sslKey: boolean;
  serviceToken: boolean;
  kibanaAPIKey: boolean;
}

export const OutputFormRemoteEsSection: React.FunctionComponent<Props> = (props) => {
  const { inputs, useSecretsStorage, onToggleSecretStorage } = props;
  const [isConvertedToSecret, setIsConvertedToSecret] = React.useState<IsConvertedToSecret>({
    serviceToken: false,
    kibanaAPIKey: false,
    sslKey: false,
  });
  const { enableSyncIntegrationsOnRemote } = ExperimentalFeaturesService.get();

  const [isFirstLoad, setIsFirstLoad] = React.useState(true);

  useEffect(() => {
    if (!isFirstLoad) return;
    setIsFirstLoad(false);
    // populate the secret input with the value of the plain input in order to re-save the output with secret storage
    if (useSecretsStorage) {
      let isServiceTokenSecret = false;
      if (inputs.serviceTokenInput.value && !inputs.serviceTokenSecretInput.value) {
        inputs.serviceTokenSecretInput.setValue(inputs.serviceTokenInput.value);
        inputs.serviceTokenInput.clear();
        isServiceTokenSecret = true;
      }
      let isKibanaAPIKeySecret = false;
      if (inputs.kibanaAPIKeyInput.value && !inputs.kibanaAPIKeySecretInput.value) {
        inputs.kibanaAPIKeySecretInput.setValue(inputs.kibanaAPIKeyInput.value);
        inputs.kibanaAPIKeyInput.clear();
        isKibanaAPIKeySecret = true;
      }
      let isSslKeySecretInput = false;
      if (inputs.sslKeyInput.value && !inputs.sslKeySecretInput.value) {
        inputs.sslKeySecretInput.setValue(inputs.sslKeyInput.value);
        inputs.sslKeyInput.clear();
        isSslKeySecretInput = true;
      }
      setIsConvertedToSecret({
        ...isConvertedToSecret,
        serviceToken: isServiceTokenSecret,
        kibanaAPIKey: isKibanaAPIKeySecret,
        sslKey: isSslKeySecretInput,
      });
    }
  }, [
    useSecretsStorage,
    inputs.serviceTokenInput,
    inputs.serviceTokenSecretInput,
    inputs.kibanaAPIKeyInput,
    inputs.kibanaAPIKeySecretInput,
    isFirstLoad,
    setIsFirstLoad,
    isConvertedToSecret,
    inputs.sslKeyInput,
    inputs.sslKeySecretInput,
  ]);

  const onToggleSecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.serviceTokenInput.clear();
      inputs.kibanaAPIKeyInput.clear();
      inputs.sslKeyInput.clear();
    } else {
      inputs.serviceTokenSecretInput.setValue('');
      inputs.kibanaAPIKeySecretInput.setValue('');
    }
    setIsConvertedToSecret({
      ...isConvertedToSecret,
      serviceToken: false,
      kibanaAPIKey: false,
      sslKey: false,
    });
    onToggleSecretStorage(secretEnabled);
  };

  return (
    <>
      <MultiRowInput
        data-test-subj="settingsOutputsFlyout.hostUrlInput"
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.remoteEsHostsInputLabel', {
          defaultMessage: 'Hosts',
        })}
        placeholder={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.remoteEsHostsInputPlaceholder',
          {
            defaultMessage: 'Specify host URL',
          }
        )}
        {...inputs.elasticsearchUrlInput.props}
        isUrl
      />
      <EuiSpacer size="m" />
      {!useSecretsStorage ? (
        <SecretFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.serviceTokenLabel"
              defaultMessage="Service token"
            />
          }
          {...inputs.serviceTokenInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          onToggleSecretStorage={onToggleSecretAndClearValue}
        >
          <EuiFieldText
            fullWidth
            data-test-subj="serviceTokenSecretInput"
            {...inputs.serviceTokenInput.props}
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.remoteESHostPlaceholder',
              {
                defaultMessage: 'Specify service token',
              }
            )}
          />
        </SecretFormRow>
      ) : (
        <SecretFormRow
          fullWidth
          title={i18n.translate('xpack.fleet.settings.editOutputFlyout.serviceTokenLabel', {
            defaultMessage: 'Service token',
          })}
          {...inputs.serviceTokenSecretInput.formRowProps}
          cancelEdit={inputs.serviceTokenSecretInput.cancelEdit}
          useSecretsStorage={useSecretsStorage}
          isConvertedToSecret={isConvertedToSecret.serviceToken}
          onToggleSecretStorage={onToggleSecretAndClearValue}
        >
          <EuiFieldText
            data-test-subj="serviceTokenSecretInput"
            fullWidth
            {...inputs.serviceTokenSecretInput.props}
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.remoteESHostPlaceholder',
              {
                defaultMessage: 'Specify service token',
              }
            )}
          />
        </SecretFormRow>
      )}
      <EuiSpacer size="m" />
      <SSLFormSection
        inputs={inputs}
        useSecretsStorage={false}
        isConvertedToSecret={isConvertedToSecret.sslKey}
        onToggleSecretAndClearValue={onToggleSecretAndClearValue}
      />
      <EuiSpacer size="m" />
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.serviceTokenCalloutText"
            defaultMessage="Generate a service token by running this API request in the Remote Kibana Console and copy the response value"
          />
        }
        data-test-subj="serviceTokenCallout"
      >
        <EuiCodeBlock isCopyable={true}>
          {`POST kbn:/api/fleet/service_tokens
{
  "remote": true
}`}
        </EuiCodeBlock>
      </EuiCallOut>
      <EuiSpacer size="m" />
      {enableSyncIntegrationsOnRemote ? (
        <>
          <EuiFormRow
            fullWidth
            helpText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.syncIntegrationsFormRowLabel"
                defaultMessage="If enabled, Integration assets will be installed on the remote Elasticsearch cluster"
              />
            }
            {...inputs.syncIntegrationsInput.formRowProps}
          >
            <EuiSwitch
              {...inputs.syncIntegrationsInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.syncIntegrationsSwitchLabel"
                  defaultMessage="Synchronize integrations"
                />
              }
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kibanaURLInputLabel"
                defaultMessage="Remote Kibana URL"
              />
            }
            {...inputs.kibanaURLInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="settingsOutputsFlyout.kibanaURLInput"
              fullWidth
              {...inputs.kibanaURLInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.kibanaURLInputPlaceholder',
                {
                  defaultMessage: 'Specify Kibana URL',
                }
              )}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          {!useSecretsStorage ? (
            <SecretFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.kibanaAPIKeyLabel"
                  defaultMessage="Remote Kibana API Key"
                />
              }
              {...inputs.kibanaAPIKeyInput.formRowProps}
              useSecretsStorage={useSecretsStorage}
              onToggleSecretStorage={onToggleSecretAndClearValue}
            >
              <EuiFieldText
                fullWidth
                data-test-subj="kibanaAPIKeySecretInput"
                {...inputs.kibanaAPIKeyInput.props}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.editOutputFlyout.kibanaAPIKeyPlaceholder',
                  {
                    defaultMessage: 'Specify Kibana API Key',
                  }
                )}
              />
            </SecretFormRow>
          ) : (
            <SecretFormRow
              fullWidth
              title={i18n.translate('xpack.fleet.settings.editOutputFlyout.kibanaAPIKeyLabel', {
                defaultMessage: 'Remote Kibana API Key',
              })}
              {...inputs.kibanaAPIKeySecretInput.formRowProps}
              cancelEdit={inputs.kibanaAPIKeySecretInput.cancelEdit}
              useSecretsStorage={useSecretsStorage}
              isConvertedToSecret={isConvertedToSecret.kibanaAPIKey}
              onToggleSecretStorage={onToggleSecretAndClearValue}
            >
              <EuiFieldText
                data-test-subj="kibanaAPIKeySecretInput"
                fullWidth
                {...inputs.kibanaAPIKeySecretInput.props}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.editOutputFlyout.kibanaAPIKeyPlaceholder',
                  {
                    defaultMessage: 'Specify Kibana API Key',
                  }
                )}
              />
            </SecretFormRow>
          )}
          <EuiSpacer size="m" />
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kibanaAPIKeyCalloutText"
                defaultMessage="Create an API Key by running this API request in the Remote Kibana Console and copy the encoded value"
              />
            }
            data-test-subj="kibanaAPIKeyCallout"
          >
            <EuiCodeBlock isCopyable={true}>
              {` POST /_security/api_key
   {
     "name": "integration_sync_api_key",
     "role_descriptors": {
       "integration_writer": {
         "cluster": [],
        "indices":[],
        "applications": [{
           "application": "kibana-.kibana",
             "privileges": ["feature_fleet.read", "feature_fleetv2.read"],
             "resources": ["*"]
         }]
        }
     }
   }`}
            </EuiCodeBlock>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ) : null}
    </>
  );
};
