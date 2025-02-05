/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';

import { useStartServices } from '../../../../hooks';

import type { OutputFormInputsType } from './use_output_form';

interface Props {
  inputs: OutputFormInputsType;
}

export const OutputFormElasticsearchSection: React.FunctionComponent<Props> = (props) => {
  const { inputs } = props;
  const { cloud } = useStartServices();

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
    </>
  );
};
