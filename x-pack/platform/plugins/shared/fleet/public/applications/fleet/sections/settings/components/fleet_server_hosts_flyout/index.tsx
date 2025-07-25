/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiComboBox,
  EuiCallOut,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { MultiRowInput } from '../multi_row_input';
import { MAX_FLYOUT_WIDTH } from '../../../../constants';
import { useFleetStatus, useStartServices } from '../../../../hooks';
import type { FleetServerHost, FleetProxy } from '../../../../types';
import { TextInput } from '../form';
import { ProxyWarning } from '../fleet_proxies_table/proxy_warning';

import { ExperimentalFeaturesService } from '../../../../services';

import { SSLFormSection } from './ssl_form_section';
import { useFleetServerHostsForm } from './use_fleet_server_host_form';

export interface FleetServerHostsFlyoutProps {
  onClose: () => void;
  fleetServerHost?: FleetServerHost;
  defaultFleetServerHost?: FleetServerHost;
  proxies: FleetProxy[];
}

export const FleetServerHostsFlyout: React.FunctionComponent<FleetServerHostsFlyoutProps> = ({
  onClose,
  fleetServerHost,
  defaultFleetServerHost,
  proxies,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  const { docLinks, cloud } = useStartServices();

  const form = useFleetServerHostsForm(fleetServerHost, onClose, defaultFleetServerHost);
  const { inputs } = form;

  const proxiesOptions = useMemo(
    () => proxies.map((proxy) => ({ value: proxy.id, label: proxy.name })),
    [proxies]
  );

  const { enableSSLSecrets } = ExperimentalFeaturesService.get();
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const [isConvertedToSecret, setIsConvertedToSecret] = React.useState({
    sslKey: false,
    sslESKey: false,
  });
  const [secretsToggleState, setSecretsToggleState] = useState<'disabled' | true | false>(true);

  const useSecretsStorage = secretsToggleState === true;

  const fleetStatus = useFleetStatus();
  if (fleetStatus.isSecretsStorageEnabled !== undefined && secretsToggleState === 'disabled') {
    setSecretsToggleState(fleetStatus.isSecretsStorageEnabled);
  }

  const onToggleSecretStorage = (secretEnabled: boolean) => {
    if (secretsToggleState === 'disabled') {
      return;
    }

    setSecretsToggleState(secretEnabled);
  };

  useEffect(() => {
    if (!isFirstLoad) return;
    setIsFirstLoad(false);
    // populate the secret input with the value of the plain input in order to re-save the key with secret storage
    if (useSecretsStorage && enableSSLSecrets) {
      if (inputs.sslKeyInput.value && !inputs.sslKeySecretInput.value) {
        inputs.sslKeySecretInput.setValue(inputs.sslKeyInput.value);
        inputs.sslKeyInput.clear();
        setIsConvertedToSecret({ ...isConvertedToSecret, sslKey: true });
      }
      if (inputs.sslESKeyInput.value && !inputs.sslESKeySecretInput.value) {
        inputs.sslESKeySecretInput.setValue(inputs.sslESKeyInput.value);
        inputs.sslESKeyInput.clear();
        setIsConvertedToSecret({ ...isConvertedToSecret, sslESKey: true });
      }
    }
  }, [
    inputs.sslKeyInput,
    inputs.sslKeySecretInput,
    isFirstLoad,
    setIsFirstLoad,
    isConvertedToSecret,
    inputs.sslESKeyInput,
    inputs.sslESKeySecretInput,
    secretsToggleState,
    useSecretsStorage,
    enableSSLSecrets,
  ]);

  const onToggleSecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.sslKeyInput.clear();
      inputs.sslESKeyInput.clear();
    } else {
      inputs.sslKeySecretInput.setValue('');
      inputs.sslESKeySecretInput.setValue('');
    }
    setIsConvertedToSecret({ ...isConvertedToSecret, sslKey: false, sslESKey: false });
    onToggleSecretStorage(secretEnabled);
  };

  return (
    <EuiFlyout onClose={onClose} maxWidth={MAX_FLYOUT_WIDTH} aria-labelledby={modalTitleId}>
      <EuiFlyoutHeader hasBorder={true}>
        <>
          <EuiTitle size="m">
            <h2 id={modalTitleId}>
              {fleetServerHost ? (
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHostsFlyout.editTitle"
                  defaultMessage="Edit Fleet Server"
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHostsFlyout.addTitle"
                  defaultMessage="Add Fleet Server"
                />
              )}
            </h2>
          </EuiTitle>
          {!fleetServerHost && (
            <>
              <EuiSpacer size="m" />
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHostsFlyout.serverlessInfoText"
                  defaultMessage="You may create another Fleet Server definition reachable via a proxy. In context of the serverless project, Fleet Service is managed by Elastic. Creation of a new one is therefore not permitted."
                />
              </EuiText>
            </>
          )}
        </>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {fleetServerHost && (
          <EuiCallOut
            size="m"
            color="warning"
            iconType="warning"
            title={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.warningCalloutTitle"
                defaultMessage="Changing these settings can break your agent connections"
              />
            }
          >
            <FormattedMessage
              id="xpack.fleet.settings.fleetServerHostsFlyout.warningCalloutDescription"
              defaultMessage="Invalid settings can break the connection between Elastic Agent and Fleet Server. If this happens, you will need to re-enroll your agents."
            />
          </EuiCallOut>
        )}
        <EuiSpacer size="m" />
        <EuiForm onSubmit={form.submit}>
          <TextInput
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.nameInputLabel"
                defaultMessage="Name"
              />
            }
            inputProps={inputs.nameInput}
            dataTestSubj="fleetServerHostsFlyout.nameInput"
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetServerHostsFlyout.nameInputPlaceholder',
              { defaultMessage: 'Specify name' }
            )}
          />
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.hostUrlLabel"
                defaultMessage="URL"
              />
            }
          >
            <>
              {!cloud?.isServerlessEnabled && (
                <>
                  <EuiText color="subdued" size="relative">
                    <FormattedMessage
                      id="xpack.fleet.settings.fleetServerHostsFlyout.description"
                      defaultMessage="Specify multiple URLs to scale out your deployment and provide automatic failover. If multiple URLs exist, Fleet shows the first provided URL for enrollment purposes. Enrolled Elastic Agents will connect to the URLs in round robin order until they connect successfully. For more information, see the {link} ."
                      values={{
                        link: (
                          <EuiLink
                            href={docLinks.links.fleet.settingsFleetServerHostSettings}
                            target="_blank"
                            external
                          >
                            <FormattedMessage
                              id="xpack.fleet.settings.fleetServerHostsFlyout.userGuideLink"
                              defaultMessage="Fleet and Elastic Agent Guide"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </EuiText>
                  <EuiSpacer size="m" />
                </>
              )}
              <MultiRowInput
                {...inputs.hostUrlsInput.props}
                id="fleet-server-inputs"
                placeholder={i18n.translate(
                  'xpack.fleet.settings.fleetServerHostsFlyout.fleetServerHostsInputPlaceholder',
                  {
                    defaultMessage: 'Specify host URL',
                  }
                )}
                isUrl
                helpText={
                  cloud?.isServerlessEnabled && (
                    <FormattedMessage
                      id="xpack.fleet.settings.fleetServerHostsFlyout.serverlessHostUrlsHelpText"
                      defaultMessage="Custom host URLs are not allowed in serverless."
                    />
                  )
                }
              />
            </>
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.proxyIdLabel"
                defaultMessage="Proxy"
              />
            }
          >
            <>
              <EuiComboBox
                fullWidth
                data-test-subj="fleetServerHostsFlyout.proxyIdInput"
                {...inputs.proxyIdInput?.props}
                onChange={(options) => inputs?.proxyIdInput?.setValue(options?.[0]?.value ?? '')}
                selectedOptions={
                  inputs?.proxyIdInput?.value !== ''
                    ? proxiesOptions.filter((option) => option.value === inputs.proxyIdInput?.value)
                    : []
                }
                options={proxiesOptions}
                singleSelection={{ asPlainText: true }}
                isDisabled={inputs.proxyIdInput?.props.disabled}
                isClearable={true}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.fleetServerHostsFlyout.proxyIdPlaceholder',
                  {
                    defaultMessage: 'Select proxy',
                  }
                )}
              />
              <EuiSpacer size="xs" />
              <ProxyWarning />
            </>
          </EuiFormRow>
          <EuiFormRow fullWidth {...inputs.isDefaultInput.formRowProps}>
            <EuiSwitch
              data-test-subj="fleetServerHostsFlyout.isDefaultSwitch"
              {...inputs.isDefaultInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHostsFlyout.defaultOutputSwitchLabel"
                  defaultMessage="Make this Fleet server the default one."
                />
              }
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
          <SSLFormSection
            inputs={inputs}
            useSecretsStorage={enableSSLSecrets && useSecretsStorage}
            onToggleSecretAndClearValue={onToggleSecretAndClearValue}
            isConvertedToSecret={isConvertedToSecret}
          />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()} flush="left">
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={form.isLoading}
              isDisabled={form.isDisabled}
              onClick={form.submit}
              data-test-subj="saveApplySettingsBtn"
              aria-label="Save and apply settings"
            >
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.saveButton"
                defaultMessage="Save and apply settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
