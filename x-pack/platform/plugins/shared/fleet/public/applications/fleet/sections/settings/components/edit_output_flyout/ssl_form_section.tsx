/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTextArea, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';

import { SecretFormRow } from './output_form_secret_form_row';

import type { OutputFormInputsType } from './use_output_form';

interface Props {
  inputs: OutputFormInputsType;
  useSecretsStorage: boolean;
  isConvertedToSecret: boolean;
  onToggleSecretAndClearValue: (secretEnabled: boolean) => void;
}

export const SSLFormSection: React.FunctionComponent<Props> = (props) => {
  const { inputs, useSecretsStorage, isConvertedToSecret, onToggleSecretAndClearValue } = props;

  return (
    <>
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
          onToggleSecretStorage={onToggleSecretAndClearValue}
          disabled={!useSecretsStorage}
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
          isConvertedToSecret={isConvertedToSecret}
          onToggleSecretStorage={onToggleSecretAndClearValue}
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
    </>
  );
};
