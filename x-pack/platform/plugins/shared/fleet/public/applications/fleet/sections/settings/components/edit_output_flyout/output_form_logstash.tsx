/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiSpacer, EuiLink, EuiSwitch, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../../../hooks';
import { LogstashInstructions } from '../logstash_instructions';

import { MultiRowInput } from '../multi_row_input';

import type { OutputFormInputsType } from './use_output_form';

import { EncryptionKeyRequiredCallout } from './encryption_key_required_callout';
import { SSLFormSection, type FormType } from './ssl_form_section';

interface Props {
  inputs: OutputFormInputsType;
  useSecretsStorage: boolean;
  onToggleSecretStorage: (secretEnabled: boolean) => void;
  hasEncryptedSavedObjectConfigured: boolean;
}

export const OutputFormLogstashSection: React.FunctionComponent<Props> = (props) => {
  const { inputs, useSecretsStorage, onToggleSecretStorage, hasEncryptedSavedObjectConfigured } =
    props;
  const { docLinks } = useStartServices();

  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const [isConvertedToSecret, setIsConvertedToSecret] = React.useState({
    sslKey: false,
  });

  useEffect(() => {
    if (!isFirstLoad) return;
    setIsFirstLoad(false);
    // populate the secret input with the value of the plain input in order to re-save the output with secret storage
    if (useSecretsStorage) {
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
    <>
      {!hasEncryptedSavedObjectConfigured && (
        <>
          <EuiSpacer size="m" />
          <EncryptionKeyRequiredCallout />
        </>
      )}
      <EuiSpacer size="m" />
      <EuiSwitch
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.logstashSSLSwitchLabel', {
          defaultMessage: 'Enable SSL',
        })}
        {...inputs.logstashEnableSSLInput.props}
      />
      {!inputs.logstashEnableSSLInput.value && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.logstashSSLSwitchCalloutTitle',
              { defaultMessage: 'Proceed with caution!' }
            )}
            color="warning"
            iconType="warning"
          >
            <p>
              {i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.logstashSSLSwitchCalloutMessage',
                {
                  defaultMessage:
                    'Using SSL/TLS ensures that your Elastic Agents send encrypted data to trusted Logstash servers, and that your Logstash servers receive data from trusted Elastic Agent clients.',
                }
              )}
            </p>
          </EuiCallOut>
        </>
      )}
      <EuiSpacer size="m" />
      <LogstashInstructions isSSLEnabled={inputs.logstashEnableSSLInput.value} />
      <EuiSpacer size="m" />
      <MultiRowInput
        placeholder={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.logstashHostsInputPlaceholder',
          {
            defaultMessage: 'Specify host',
          }
        )}
        sortable={false}
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.logstashHostsInputDescription"
            defaultMessage="Specify the addresses that your agents will use to connect to Logstash. {guideLink}."
            values={{
              guideLink: (
                <EuiLink href={docLinks.links.fleet.logstashSettings} target="_blank" external>
                  <FormattedMessage
                    id="xpack.fleet.settings.fleetSettingsLink"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.logstashHostsInputLabel', {
          defaultMessage: 'Logstash hosts',
        })}
        {...inputs.logstashHostsInput.props}
      />
      <EuiSpacer size="m" />
      {inputs.logstashEnableSSLInput.value && (
        <SSLFormSection
          inputs={inputs}
          useSecretsStorage={useSecretsStorage}
          isConvertedToSecret={isConvertedToSecret.sslKey}
          onToggleSecretAndClearValue={onToggleSecretAndClearValue}
          type={inputs.typeInput.value as FormType}
        />
      )}
    </>
  );
};
