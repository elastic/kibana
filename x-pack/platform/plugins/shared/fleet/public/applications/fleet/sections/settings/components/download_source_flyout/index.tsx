/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiComboBox,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
  EuiSwitch,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DownloadSource, FleetProxy } from '../../../../types';
import { MAX_FLYOUT_WIDTH } from '../../../../constants';
import { useBreadcrumbs, useFleetStatus, useStartServices } from '../../../../hooks';
import { ProxyWarning } from '../fleet_proxies_table/proxy_warning';
import { ExperimentalFeaturesService } from '../../../../services';

import { useDowloadSourceFlyoutForm } from './use_download_source_flyout_form';
import { SSLFormSection } from './ssl_form_section';

export interface EditDownloadSourceFlyoutProps {
  downloadSource?: DownloadSource;
  onClose: () => void;
  proxies: FleetProxy[];
}

export const EditDownloadSourceFlyout: React.FunctionComponent<EditDownloadSourceFlyoutProps> = ({
  onClose,
  downloadSource,
  proxies,
}) => {
  useBreadcrumbs('settings');
  const form = useDowloadSourceFlyoutForm(onClose, downloadSource);
  const inputs = form.inputs;
  const { docLinks } = useStartServices();
  const proxiesOptions = useMemo(
    () => proxies.map((proxy) => ({ value: proxy.id, label: proxy.name })),
    [proxies]
  );

  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const [secretsToggleState, setSecretsToggleState] = useState<'disabled' | true | false>(true);
  const useSecretsStorage = secretsToggleState === true;
  const [isConvertedToSecret, setIsConvertedToSecret] = React.useState({
    sslKey: false,
  });
  const { enableSSLSecrets } = ExperimentalFeaturesService.get();

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
    // populate the secret input with the value of the plain input in order to re-save the output with secret storage
    if (useSecretsStorage && enableSSLSecrets) {
      if (inputs.sslKeyInput.value && !inputs.sslKeySecretInput.value) {
        inputs.sslKeySecretInput.setValue(inputs.sslKeyInput.value);
        inputs.sslKeyInput.clear();
        setIsConvertedToSecret({ ...isConvertedToSecret, sslKey: true });
      }
    }
  }, [
    useSecretsStorage,
    inputs.sslKeyInput,
    inputs.sslKeySecretInput,
    isFirstLoad,
    setIsFirstLoad,
    isConvertedToSecret,
    enableSSLSecrets,
  ]);

  const onToggleSecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.sslKeyInput.clear();
    } else {
      inputs.sslKeySecretInput.setValue('');
    }
    setIsConvertedToSecret({ sslKey: false });
    onToggleSecretStorage(secretEnabled);
  };

  return (
    <EuiFlyout onClose={onClose} maxWidth={MAX_FLYOUT_WIDTH}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2 id="FleetEditDownloadSourcesFlyoutTitle">
            {!downloadSource ? (
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.createTitle"
                defaultMessage="Add new agent binary source"
                data-test-subj="editDownloadSourcesFlyout.add.title"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.editTitle"
                defaultMessage="Edit agent binary source"
                data-test-subj="editDownloadSourcesFlyout.edit.title"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.nameInputLabel"
                defaultMessage="Name"
              />
            }
            {...inputs.nameInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="editDownloadSourcesFlyout.nameInput"
              fullWidth
              {...inputs.nameInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editDownloadSourcesFlyout.nameInputPlaceholder',
                {
                  defaultMessage: 'Specify name',
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            helpText={
              <FormattedMessage
                data-test-subj="editDownloadSourcesFlyout.hostHelpText"
                id="xpack.fleet.settings.editDownloadSourcesFlyout.hostsInputDescription"
                defaultMessage="Enter the address of the directory containing the binaries to download. {guideLink}"
                values={{
                  guideLink: (
                    <EuiLink href={docLinks.links.fleet.settings} target="_blank" external>
                      <FormattedMessage
                        id="xpack.fleet.settings.fleetSettingsLink"
                        defaultMessage="Learn more"
                      />
                    </EuiLink>
                  ),
                }}
              />
            }
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.hostInputLabel"
                defaultMessage="Host"
              />
            }
            {...inputs.hostInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="editDownloadSourcesFlyout.hostInput"
              fullWidth
              {...inputs.hostInput.props}
              placeholder="https://artifacts.elastic.co/downloads"
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.proxyIdLabel"
                defaultMessage="Proxy"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.proxyInputDescription"
                defaultMessage="Proxy used for accessing the download source. Currently only the proxy URL is used, headers and certificates are not supported."
              />
            }
          >
            <EuiComboBox
              fullWidth
              data-test-subj="settingsOutputsFlyout.proxyIdInput"
              {...inputs.proxyIdInput.props}
              onChange={(options) => inputs.proxyIdInput.setValue(options?.[0]?.value ?? '')}
              selectedOptions={
                inputs.proxyIdInput.value !== ''
                  ? proxiesOptions.filter((option) => option.value === inputs.proxyIdInput.value)
                  : []
              }
              options={proxiesOptions}
              singleSelection={{ asPlainText: true }}
              isDisabled={inputs.proxyIdInput.props.disabled}
              isClearable={true}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editDownloadSourcesFlyout.proxyIdPlaceholder',
                {
                  defaultMessage: 'Select proxy',
                }
              )}
            />
          </EuiFormRow>
          <EuiSpacer size="xs" />
          <ProxyWarning />
          <EuiSpacer size="m" />
          <EuiFormRow fullWidth {...inputs.defaultDownloadSourceInput.formRowProps}>
            <EuiSwitch
              data-test-subj="editDownloadSourcesFlyout.isDefaultSwitch"
              {...inputs.defaultDownloadSourceInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editDownloadSourcesFlyout.defaultSwitchLabel"
                  defaultMessage="Make this host the default for all agent policies."
                />
              }
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <SSLFormSection
            inputs={inputs}
            useSecretsStorage={enableSSLSecrets && useSecretsStorage}
            isConvertedToSecret={isConvertedToSecret.sslKey}
            onToggleSecretAndClearValue={onToggleSecretAndClearValue}
          />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              flush="left"
              data-test-subj="editDownloadSourcesFlyout.cancelBtn"
            >
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.cancelButtonLabel"
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
              data-test-subj="editDownloadSourcesFlyout.submitBtn"
            >
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.saveButton"
                defaultMessage="Save and apply settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
