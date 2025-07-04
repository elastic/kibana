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
  EuiButton,
  EuiLink,
  EuiCode,
  EuiFieldPassword,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { snakeCase } from 'lodash';

import { MultiRowInput } from '../multi_row_input';

import { ExperimentalFeaturesService } from '../../../../services';

import { licenseService, useStartServices } from '../../../../hooks';

import type { OutputFormInputsType } from './use_output_form';
import { SecretFormRow } from './output_form_secret_form_row';
import { SSLFormSection, type FormType } from './ssl_form_section';

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
  const { docLinks, cloud } = useStartServices();
  const { inputs, useSecretsStorage, onToggleSecretStorage } = props;
  const [isConvertedToSecret, setIsConvertedToSecret] = React.useState<IsConvertedToSecret>({
    serviceToken: false,
    kibanaAPIKey: false,
    sslKey: false,
  });
  const { enableSyncIntegrationsOnRemote, enableSSLSecrets } = ExperimentalFeaturesService.get();
  const enableSyncIntegrations =
    enableSyncIntegrationsOnRemote && licenseService.isEnterprise() && !cloud?.isServerlessEnabled;

  const [isRemoteClusterInstructionsOpen, setIsRemoteClusterInstructionsOpen] =
    React.useState(false);

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
      let isSslKeySecretInput = false;
      if (enableSSLSecrets) {
        if (inputs.sslKeyInput.value && !inputs.sslKeySecretInput.value) {
          inputs.sslKeySecretInput.setValue(inputs.sslKeyInput.value);
          inputs.sslKeyInput.clear();
          isSslKeySecretInput = true;
        }
      }
      setIsConvertedToSecret({
        ...isConvertedToSecret,
        serviceToken: isServiceTokenSecret,
        sslKey: isSslKeySecretInput,
      });
    }
  }, [
    useSecretsStorage,
    inputs.serviceTokenInput,
    inputs.serviceTokenSecretInput,
    inputs.kibanaAPIKeyInput,
    isFirstLoad,
    setIsFirstLoad,
    isConvertedToSecret,
    inputs.sslKeyInput,
    inputs.sslKeySecretInput,
    enableSSLSecrets,
  ]);

  const onToggleSecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.serviceTokenInput.clear();
      inputs.kibanaAPIKeyInput.clear();
      if (enableSSLSecrets) inputs.sslKeyInput.clear();
    } else {
      inputs.serviceTokenSecretInput.setValue('');
      if (enableSSLSecrets) inputs.sslKeyInput.setValue('');
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
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.serviceTokenCalloutText"
            defaultMessage="Generate a service token by running this API request in the remote Kibana Console and copy the response value"
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
      <SSLFormSection
        type={inputs.typeInput.value as FormType}
        inputs={inputs}
        useSecretsStorage={enableSSLSecrets && useSecretsStorage}
        isConvertedToSecret={isConvertedToSecret.sslKey}
        onToggleSecretAndClearValue={onToggleSecretAndClearValue}
      />
      <EuiSpacer size="m" />
      {enableSyncIntegrations ? (
        <>
          <EuiFormRow
            fullWidth
            helpText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.syncIntegrationsFormRowLabel"
                defaultMessage="If enabled, integration assets will be installed on the remote Elasticsearch cluster"
              />
            }
            {...inputs.syncIntegrationsInput.formRowProps}
          >
            <EuiSwitch
              {...inputs.syncIntegrationsInput.props}
              data-test-subj="syncIntegrationsSwitch"
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.syncIntegrationsSwitchLabel"
                  defaultMessage="Synchronize integrations"
                />
              }
            />
          </EuiFormRow>
          {inputs.syncIntegrationsInput.value === true && (
            <>
              <EuiSpacer size="m" />
              <EuiFormRow
                fullWidth
                helpText={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.syncUninstalledIntegrationsFormRowLabel"
                    defaultMessage="If enabled, uninstalled integrations will also be uninstalled on the remote Elasticsearch cluster"
                  />
                }
                {...inputs.syncUninstalledIntegrationsInput.formRowProps}
              >
                <EuiSwitch
                  {...inputs.syncUninstalledIntegrationsInput.props}
                  data-test-subj="syncUninstalledIntegrationsSwitch"
                  label={
                    <FormattedMessage
                      id="xpack.fleet.settings.editOutputFlyout.syncUninstalledIntegrationsSwitchLabel"
                      defaultMessage="Uninstall integrations on remote"
                    />
                  }
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiCallOut
                iconType="info"
                title={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.remoteClusterConfigurationCalloutTitle"
                    defaultMessage="Additional remote cluster configuration required"
                  />
                }
                data-test-subj="remoteClusterConfigurationCallout"
              >
                {isRemoteClusterInstructionsOpen ? (
                  <EuiButton onClick={() => setIsRemoteClusterInstructionsOpen(false)}>
                    <FormattedMessage
                      id="xpack.fleet.settings.remoteClusterConfiguration.collapseInstructionsButtonLabel"
                      defaultMessage="Collapse steps"
                    />
                  </EuiButton>
                ) : (
                  <EuiButton onClick={() => setIsRemoteClusterInstructionsOpen(true)} fill={true}>
                    <FormattedMessage
                      id="xpack.fleet.settings.remoteClusterConfiguration.viewInstructionButtonLabel"
                      defaultMessage="View steps"
                    />
                  </EuiButton>
                )}
                {isRemoteClusterInstructionsOpen && (
                  <>
                    <EuiSpacer size="m" />
                    <FormattedMessage
                      id="xpack.fleet.settings.remoteClusterConfiguration.description"
                      defaultMessage="To sync integrations from this cluster, the remote Elasticsearch output needs additional configuration. {documentationLink}."
                      values={{
                        documentationLink: (
                          <EuiLink external={true} href={docLinks.links.fleet.remoteESOoutput}>
                            <FormattedMessage
                              id="xpack.fleet.settings.remoteClusterConfiguration.documentationLink"
                              defaultMessage="Learn more"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                    <EuiSpacer size="m" />
                    <ol>
                      <li>
                        <FormattedMessage
                          id="xpack.fleet.settings.remoteClusterConfiguration.addRemoteClusterStep"
                          defaultMessage="In the remote cluster, open Kibana and go to {appPath}, and follow the steps to add this cluster."
                          values={{
                            appPath: (
                              <strong>
                                <FormattedMessage
                                  id="xpack.fleet.settings.remoteClusterConfiguration.addRemoteClusterKibanaPath"
                                  defaultMessage="Stack Management > Remote Clusters"
                                />
                              </strong>
                            ),
                          }}
                        />
                        <EuiSpacer size="s" />
                      </li>
                      <li>
                        <FormattedMessage
                          id="xpack.fleet.settings.remoteClusterConfiguration.replicationStep"
                          defaultMessage="Go to {appPath} and create a follower index using the cluster from Step 1. The leader index is {leaderIndex} from this cluster and should be replicated to the follower index {followerIndex} on the remote cluster."
                          values={{
                            appPath: (
                              <strong>
                                <FormattedMessage
                                  id="xpack.fleet.settings.remoteClusterConfiguration.replicationKibanaPath"
                                  defaultMessage="Stack Management > Cross-Cluster Replication"
                                />
                              </strong>
                            ),
                            leaderIndex: <EuiCode>fleet-synced-integrations</EuiCode>,
                            followerIndex: (
                              <EuiCode>
                                fleet-synced-integrations-ccr-
                                {snakeCase(inputs.nameInput.props.value) || '<output name>'}
                              </EuiCode>
                            ),
                          }}
                        />
                        <EuiSpacer size="s" />
                      </li>
                      <li>
                        <FormattedMessage
                          id="xpack.fleet.settings.remoteClusterConfiguration.configureKibanaStep"
                          defaultMessage="Below, provide the access details for the remote cluster's Kibana instance."
                        />
                      </li>
                    </ol>
                    <EuiSpacer size="s" />
                    <FormattedMessage
                      id="xpack.fleet.settings.remoteClusterConfiguration.ccsDescription"
                      defaultMessage="To search accross remote clusters from this cluster, see the {prerequisites}. Once the remote cluster is added, CCS Data Views will be created automatically."
                      values={{
                        prerequisites: (
                          <EuiLink
                            target="_blank"
                            href={`${docLinks.links.ccs.guide}#_prerequisites`}
                          >
                            <FormattedMessage
                              id="xpack.fleet.settings.remoteClusterConfiguration.ccsDocumentationLink"
                              defaultMessage="CCS prerequisites"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </>
                )}
              </EuiCallOut>
              <EuiSpacer size="m" />
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

              <EuiFormRow
                fullWidth
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.kibanaAPIKeyLabel"
                    defaultMessage="Remote Kibana API Key"
                  />
                }
                {...inputs.kibanaAPIKeyInput.formRowProps}
              >
                <EuiFieldPassword
                  fullWidth
                  type="dual"
                  data-test-subj="kibanaAPIKeySecretInput"
                  {...inputs.kibanaAPIKeyInput.props}
                  placeholder={i18n.translate(
                    'xpack.fleet.settings.editOutputFlyout.kibanaAPIKeyPlaceholder',
                    {
                      defaultMessage: 'Specify encoded Kibana API Key',
                    }
                  )}
                />
              </EuiFormRow>

              <EuiSpacer size="m" />
              <EuiCallOut
                title={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.kibanaAPIKeyCalloutText"
                    defaultMessage="Create an API Key by running this API request in the remote Kibana Console and copy the encoded value"
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
          )}
        </>
      ) : null}
    </>
  );
};
