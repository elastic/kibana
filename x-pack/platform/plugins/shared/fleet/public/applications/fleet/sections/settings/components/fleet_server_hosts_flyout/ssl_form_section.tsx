/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiTextArea, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';

import { SecretFormRow } from '../edit_output_flyout/output_form_secret_form_row';

import type { FleetServerHostSSLInputsType } from './use_fleet_server_host_form';

interface Props {
  inputs: FleetServerHostSSLInputsType;
  useSecretsStorage: boolean;
  onToggleSecretStorage: (secretEnabled: boolean) => void;
}

export const SSLFormSection: React.FunctionComponent<Props> = (props) => {
  const { inputs, useSecretsStorage, onToggleSecretStorage } = props;

  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const [isConvertedToSecret, setIsConvertedToSecret] = React.useState({
    sslKey: false,
    sslESKey: false,
  });

  useEffect(() => {
    if (!isFirstLoad) return;
    setIsFirstLoad(false);
    // populate the secret input with the value of the plain input in order to re-save the key with secret storage
    if (useSecretsStorage) {
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
    useSecretsStorage,
    inputs.sslKeyInput,
    inputs.sslKeySecretInput,
    isFirstLoad,
    setIsFirstLoad,
    isConvertedToSecret,
    inputs.sslESKeyInput,
    inputs.sslESKeySecretInput,
  ]);

  const onToggleKeySecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.sslKeyInput.clear();
    } else {
      inputs.sslKeySecretInput.setValue('');
    }
    setIsConvertedToSecret({ ...isConvertedToSecret, sslKey: false });
    onToggleSecretStorage(secretEnabled);
  };

  const onToggleESKeySecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.sslESKeyInput.clear();
    } else {
      inputs.sslESKeySecretInput.setValue('');
    }
    setIsConvertedToSecret({ ...isConvertedToSecret, sslESKey: false });
    onToggleSecretStorage(secretEnabled);
  };

  return (
    <>
      <MultiRowInput
        placeholder={i18n.translate(
          'xpack.fleet.settings.fleetServerHosts.sslCertificateAuthoritiesInputPlaceholder',
          {
            defaultMessage: 'Specify certificate authority',
          }
        )}
        label={i18n.translate(
          'xpack.fleet.settings.fleetServerHosts.sslCertificateAuthoritiesInputLabel',
          {
            defaultMessage: 'Server SSL certificate authorities',
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
            id="xpack.fleet.settings.fleetServerHosts.sslCertificateInputLabel"
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
            'xpack.fleet.settings.fleetServerHosts.sslCertificateInputPlaceholder',
            {
              defaultMessage: 'Specify SSL certificate',
            }
          )}
        />
      </EuiFormRow>
      {!useSecretsStorage ? (
        <SecretFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.fleetServerHosts.sslKeyInputLabel"
              defaultMessage="Client SSL certificate key"
            />
          }
          {...inputs.sslKeyInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          onToggleSecretStorage={onToggleKeySecretAndClearValue}
        >
          <EuiTextArea
            fullWidth
            rows={5}
            {...inputs.sslKeyInput.props}
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslKeyInputPlaceholder',
              {
                defaultMessage: 'Specify certificate key',
              }
            )}
          />
        </SecretFormRow>
      ) : (
        <SecretFormRow
          fullWidth
          title={i18n.translate('xpack.fleet.settings.fleetServerHosts.sslKeySecretInputTitle', {
            defaultMessage: 'Client SSL certificate key',
          })}
          {...inputs.sslKeySecretInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          isConvertedToSecret={isConvertedToSecret.sslKey}
          onToggleSecretStorage={onToggleKeySecretAndClearValue}
          cancelEdit={inputs.sslKeySecretInput.cancelEdit}
        >
          <EuiTextArea
            fullWidth
            rows={5}
            {...inputs.sslKeySecretInput.props}
            data-test-subj="sslKeySecretInput"
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslKeySecretInputPlaceholder',
              {
                defaultMessage: 'Specify certificate key',
              }
            )}
          />
        </SecretFormRow>
      )}

      <MultiRowInput
        placeholder={i18n.translate(
          'xpack.fleet.settings.fleetServerHosts.sslEsCertificateAuthoritiesInputPlaceholder',
          {
            defaultMessage: 'Specify Elasticsearch certificate authority',
          }
        )}
        label={i18n.translate(
          'xpack.fleet.settings.fleetServerHosts.sslEsCertificateAuthoritiesInputLabel',
          {
            defaultMessage: 'Elasticsearch certificate authorities',
          }
        )}
        multiline={true}
        sortable={false}
        {...inputs.sslEsCertificateAuthoritiesInput.props}
      />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.fleetServerHosts.sslEsCertificateInputLabel"
            defaultMessage="SSL certificate for Elasticsearch"
          />
        }
        {...inputs.sslEsCertificateInput.formRowProps}
      >
        <EuiTextArea
          fullWidth
          rows={5}
          {...inputs.sslEsCertificateInput.props}
          placeholder={i18n.translate(
            'xpack.fleet.settings.fleetServerHosts.sslEsCertificateInputPlaceholder',
            {
              defaultMessage: 'Specify Elasticsearch SSL certificate',
            }
          )}
        />
      </EuiFormRow>
      {!useSecretsStorage ? (
        <SecretFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.fleetServerHosts.sslEsKeyInputLabel"
              defaultMessage="SSL certificate key for Elasticsearch"
            />
          }
          {...inputs.sslESKeyInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          onToggleSecretStorage={onToggleESKeySecretAndClearValue}
        >
          <EuiTextArea
            fullWidth
            rows={5}
            {...inputs.sslESKeyInput.props}
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslKeyInputPlaceholder',
              {
                defaultMessage: 'Specify certificate key',
              }
            )}
          />
        </SecretFormRow>
      ) : (
        <SecretFormRow
          fullWidth
          title={i18n.translate('xpack.fleet.settings.fleetServerHosts.sslEsKeySecretInputTitle', {
            defaultMessage: 'SSL certificate key for Elasticsearch',
          })}
          {...inputs.sslESKeySecretInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          isConvertedToSecret={isConvertedToSecret.sslKey}
          onToggleSecretStorage={onToggleESKeySecretAndClearValue}
          cancelEdit={inputs.sslESKeySecretInput.cancelEdit}
        >
          <EuiTextArea
            fullWidth
            rows={5}
            {...inputs.sslESKeySecretInput.props}
            data-test-subj="sslESKeySecretInput"
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetServerHosts.sslESKeySecretInputPlaceholder',
              {
                defaultMessage: 'Specify certificate key',
              }
            )}
          />
        </SecretFormRow>
      )}
    </>
  );
};
