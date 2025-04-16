/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { EuiStepProps } from '@elastic/eui';
import { EuiIconTip } from '@elastic/eui';
import {
  EuiSwitch,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiForm,
  EuiFormErrorText,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { FleetServerHost } from '../../../types';

import { useStartServices, useLink, useFleetStatus } from '../../../hooks';
import type { FleetServerHostForm } from '../hooks';
import { MultiRowInput } from '../../../sections/settings/components/multi_row_input';
import { FleetServerHostSelect } from '../components';
import { SSLFormSection } from '../../../sections/settings/components/fleet_server_hosts_flyout/ssl_form_section';
import { ExperimentalFeaturesService } from '../../../services';

export const getAddFleetServerHostStep = ({
  fleetServerHostForm,
  disabled,
  onClose,
}: {
  fleetServerHostForm: FleetServerHostForm;
  disabled: boolean;
  onClose: () => void;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.addFleetServerHostStepTitle', {
      defaultMessage: 'Add your Fleet Server host',
    }),
    status: disabled ? 'disabled' : undefined,
    children: disabled ? null : (
      <AddFleetServerHostStepContent fleetServerHostForm={fleetServerHostForm} onClose={onClose} />
    ),
  };
};

export const AddFleetServerHostStepContent = ({
  fleetServerHostForm,
  onClose,
}: {
  fleetServerHostForm: FleetServerHostForm;
  onClose: () => void;
}) => {
  const {
    setFleetServerHost,
    fleetServerHost: selectedFleetServerHost,
    handleSubmitForm,
    fleetServerHosts,
    error,
    inputs,
  } = fleetServerHostForm;
  const [isLoading, setIsLoading] = useState(false);
  const [submittedFleetServerHost, setSubmittedFleetServerHost] = useState<FleetServerHost>();
  const { notifications } = useStartServices();
  const { getHref } = useLink();
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

  const onSubmit = useCallback(async () => {
    try {
      setSubmittedFleetServerHost(undefined);
      setIsLoading(true);

      const savedFleetServerHost = await handleSubmitForm();
      if (savedFleetServerHost) {
        setFleetServerHost(savedFleetServerHost);
        setSubmittedFleetServerHost(savedFleetServerHost);
      }
    } catch (err) {
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.fleetServerSetup.errorAddingFleetServerHostTitle', {
          defaultMessage: 'Error adding Fleet Server host',
        }),
      });
    } finally {
      setIsLoading(false);
    }
  }, [handleSubmitForm, setFleetServerHost, notifications.toasts]);

  return (
    <EuiForm onSubmit={onSubmit}>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.addFleetServerHostStepDescription"
          defaultMessage="First, set the public IP or host name and port that agents will use to reach Fleet Server. It uses port {port} by default {toolTip}. We'll then generate a policy for you automatically. "
          values={{
            port: <EuiCode>8220</EuiCode>,
            toolTip: (
              <EuiIconTip
                iconProps={{
                  className: 'eui-alignTop',
                }}
                content={
                  <FormattedMessage
                    id="xpack.fleet.fleetServerSetup.getStartedInstructionsPortTooltips"
                    defaultMessage="This can only be set during Fleet Server installation."
                  />
                }
                position="right"
              />
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      {selectedFleetServerHost ? (
        <FleetServerHostSelect
          setFleetServerHost={setFleetServerHost}
          selectedFleetServerHost={selectedFleetServerHost}
          fleetServerHosts={fleetServerHosts}
        />
      ) : null}
      {!selectedFleetServerHost ? (
        <>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.nameInputLabel"
                defaultMessage="Name"
              />
            }
            {...inputs.nameInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="fleetServerSetup.nameInput"
              fullWidth
              placeholder={i18n.translate('xpack.fleet.fleetServerSetup.nameInputPlaceholder', {
                defaultMessage: 'Specify name',
              })}
              {...inputs.nameInput.props}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.hostUrlLabel"
                defaultMessage="URL"
              />
            }
          >
            <>
              <MultiRowInput
                data-test-subj="fleetServerSetup.multiRowInput"
                {...inputs.hostUrlsInput.props}
                placeholder={i18n.translate(
                  'xpack.fleet.fleetServerSetup.fleetServerHostsInputPlaceholder',
                  {
                    defaultMessage: 'Specify host URL',
                  }
                )}
                isUrl
              />
              {error && <EuiFormErrorText>{error}</EuiFormErrorText>}
            </>
          </EuiFormRow>
          <EuiSpacer size="m" />
          <SSLFormSection
            inputs={inputs}
            useSecretsStorage={enableSSLSecrets && useSecretsStorage}
            onToggleSecretAndClearValue={onToggleSecretAndClearValue}
            isConvertedToSecret={isConvertedToSecret}
          />
          <EuiSpacer size="m" />
          {fleetServerHosts.length > 0 ? (
            <EuiFormRow fullWidth {...inputs.isDefaultInput.formRowProps}>
              <EuiSwitch
                data-test-subj="fleetServerHostsFlyout.isDefaultSwitch"
                {...inputs.isDefaultInput.props}
                disabled={false}
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.fleetServerHostsFlyout.defaultOutputSwitchLabel"
                    defaultMessage="Make this Fleet server the default one."
                  />
                }
              />
            </EuiFormRow>
          ) : null}
          <EuiButton
            isLoading={isLoading}
            onClick={onSubmit}
            data-test-subj="fleetServerAddHostBtn"
          >
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.addFleetServerHostButton"
              defaultMessage="Add host"
            />
          </EuiButton>
        </>
      ) : null}
      {submittedFleetServerHost && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            iconType="check"
            color="success"
            title={
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.addFleetServerHostSuccessTitle"
                defaultMessage="Added Fleet Server host"
              />
            }
          >
            <FormattedMessage
              id="xpack.fleet.fleetServerSetup.addFleetServerHostSuccessText"
              defaultMessage="Added {host}. You can edit your Fleet Server hosts in {fleetSettingsLink}."
              values={{
                host: submittedFleetServerHost.host_urls[0],
                fleetSettingsLink: (
                  // eslint-disable-next-line @elastic/eui/href-or-on-click
                  <EuiLink href={getHref('settings')} onClick={onClose}>
                    <FormattedMessage
                      id="xpack.fleet.fleetServerSetup.fleetSettingsLink"
                      defaultMessage="Fleet Settings"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiCallOut>
        </>
      )}
    </EuiForm>
  );
};
