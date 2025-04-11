/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { ExperimentalFeaturesService } from '../../../../services';

import { MultiRowInput } from '../multi_row_input';

import { useStartServices } from '../../../../hooks';

import type { OutputFormInputsType } from './use_output_form';
import { SSLFormSection, type FormType } from './ssl_form_section';

interface Props {
  inputs: OutputFormInputsType;
  useSecretsStorage: boolean;
  onToggleSecretStorage: (secretEnabled: boolean) => void;
}

export const OutputFormElasticsearchSection: React.FunctionComponent<Props> = (props) => {
  const { inputs, useSecretsStorage, onToggleSecretStorage } = props;
  const { cloud } = useStartServices();
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const [isConvertedToSecret, setIsConvertedToSecret] = React.useState({
    sslKey: false,
  });
  const { enableSSLSecrets } = ExperimentalFeaturesService.get();

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
    <>
      <MultiRowInput
        data-test-subj="settingsOutputsFlyout.hostUrlInput"
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.esHostsInputLabel', {
          defaultMessage: 'Hosts',
        })}
        placeholder={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.esHostsInputPlaceholder',
          {
            defaultMessage: 'Specify host URL',
          }
        )}
        {...inputs.elasticsearchUrlInput.props}
        isUrl
        helpText={
          cloud?.isServerlessEnabled && (
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.serverlessHostUrlsHelpText"
              defaultMessage="Custom host URLs are not allowed in serverless."
            />
          )
        }
      />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.caTrustedFingerprintInputLabel"
            defaultMessage="Elasticsearch CA trusted fingerprint (optional)"
          />
        }
        {...inputs.caTrustedFingerprintInput.formRowProps}
      >
        <EuiFieldText
          fullWidth
          {...inputs.caTrustedFingerprintInput.props}
          placeholder={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.caTrustedFingerprintInputPlaceholder',
            {
              defaultMessage: 'Specify Elasticsearch CA trusted fingerprint',
            }
          )}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <SSLFormSection
        type={inputs.typeInput.value as FormType}
        inputs={inputs}
        useSecretsStorage={enableSSLSecrets && useSecretsStorage}
        isConvertedToSecret={isConvertedToSecret.sslKey}
        onToggleSecretAndClearValue={onToggleSecretAndClearValue}
      />
    </>
  );
};
