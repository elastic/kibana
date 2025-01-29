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
  EuiSpacer,
  EuiTextArea,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';

import type { OutputFormInputsType } from './use_output_form';
import { SecretFormRow } from './output_form_secret_form_row';

interface Props {
  inputs: OutputFormInputsType;
  useSecretsStorage: boolean;
  onToggleSecretStorage: (secretEnabled: boolean) => void;
}

export const OutputFormRemoteEsSection: React.FunctionComponent<Props> = (props) => {
  const { inputs, useSecretsStorage, onToggleSecretStorage } = props;
  const [isConvertedToSecret, setIsConvertedToSecret] = React.useState({
    serviceToken: false,
    sslKey: false,
  });

  const [isFirstLoad, setIsFirstLoad] = React.useState(true);

  useEffect(() => {
    if (!isFirstLoad) return;
    setIsFirstLoad(false);
    // populate the secret input with the value of the plain input in order to re-save the output with secret storage
    if (useSecretsStorage) {
      if (inputs.serviceTokenInput.value && !inputs.serviceTokenSecretInput.value) {
        inputs.serviceTokenSecretInput.setValue(inputs.serviceTokenInput.value);
        inputs.serviceTokenInput.clear();
        setIsConvertedToSecret({ ...isConvertedToSecret, serviceToken: true });
      }
      if (inputs.sslKeyInput.value && !inputs.sslKeySecretInput.value) {
        inputs.sslKeySecretInput.setValue(inputs.sslKeyInput.value);
        inputs.sslKeyInput.clear();
        setIsConvertedToSecret({ ...isConvertedToSecret, sslKey: true });
      }
    }
  }, [
    useSecretsStorage,
    inputs.serviceTokenInput,
    inputs.serviceTokenSecretInput,
    isFirstLoad,
    setIsFirstLoad,
    isConvertedToSecret,
    inputs.sslKeyInput,
    inputs.sslKeySecretInput,
  ]);

  const onToggleServiceTokenSecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.serviceTokenInput.clear();
    } else {
      inputs.serviceTokenSecretInput.setValue('');
    }
    setIsConvertedToSecret({ ...isConvertedToSecret, serviceToken: false });
    onToggleSecretStorage(secretEnabled);
  };

  const onToggleSSLSecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.sslKeyInput.clear();
    } else {
      inputs.sslKeySecretInput.setValue('');
    }
    setIsConvertedToSecret({ ...isConvertedToSecret, sslKey: false });
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
          onToggleSecretStorage={onToggleServiceTokenSecretAndClearValue}
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
          onToggleSecretStorage={onToggleServiceTokenSecretAndClearValue}
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
      <MultiRowInput
        placeholder={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.sslCertificateAuthoritiesInputPlaceholder',
          {
            defaultMessage: 'Specify certificate authority',
          }
        )}
        label={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.sslCertificateAuthoritiesInputLabel',
          {
            defaultMessage: 'Server SSL certificate authorities (optional)',
          }
        )}
        multiline={true}
        sortable={false}
        {...inputs.sslCertificateAuthoritiesInput.props}
      />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.sslCertificateInputLabel"
            defaultMessage="Client SSL certificate"
          />
        }
        {...inputs.sslCertificateInput.formRowProps}
      >
        <EuiTextArea
          fullWidth
          rows={5}
          {...inputs.sslCertificateInput.props}
          placeholder={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.sslCertificateInputPlaceholder',
            {
              defaultMessage: 'Specify ssl certificate',
            }
          )}
        />
      </EuiFormRow>
      {!useSecretsStorage ? (
        <SecretFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.sslKeyInputLabel"
              defaultMessage="Client SSL certificate key"
            />
          }
          {...inputs.sslKeyInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          onToggleSecretStorage={onToggleSSLSecretAndClearValue}
        >
          <EuiTextArea
            fullWidth
            rows={5}
            {...inputs.sslKeyInput.props}
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.sslKeyInputPlaceholder',
              {
                defaultMessage: 'Specify certificate key',
              }
            )}
          />
        </SecretFormRow>
      ) : (
        <SecretFormRow
          fullWidth
          title={i18n.translate('xpack.fleet.settings.editOutputFlyout.sslKeySecretInputTitle', {
            defaultMessage: 'Client SSL certificate key',
          })}
          {...inputs.sslKeySecretInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          isConvertedToSecret={isConvertedToSecret?.sslKey}
          onToggleSecretStorage={onToggleSSLSecretAndClearValue}
          cancelEdit={inputs.sslKeySecretInput.cancelEdit}
        >
          <EuiTextArea
            fullWidth
            rows={5}
            {...inputs.sslKeySecretInput.props}
            data-test-subj="sslKeySecretInput"
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.sslKeySecretInputPlaceholder',
              {
                defaultMessage: 'Specify certificate key',
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
    </>
  );
};
