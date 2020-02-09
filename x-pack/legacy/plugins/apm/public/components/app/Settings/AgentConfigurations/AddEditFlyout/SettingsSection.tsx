/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiTitle,
  EuiSpacer,
  EuiFieldNumber
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { SelectWithPlaceholder } from '../../../../shared/SelectWithPlaceholder';

interface Props {
  isRumService: boolean;

  // sampleRate
  sampleRate: string;
  setSampleRate: (value: string) => void;
  isSampleRateValid?: boolean;

  // captureBody
  captureBody: string;
  setCaptureBody: (value: string) => void;

  // transactionMaxSpans
  transactionMaxSpans: string;
  setTransactionMaxSpans: (value: string) => void;
  isTransactionMaxSpansValid?: boolean;
}

export function SettingsSection({
  isRumService,

  // sampleRate
  sampleRate,
  setSampleRate,
  isSampleRateValid,

  // captureBody
  captureBody,
  setCaptureBody,

  // transactionMaxSpans
  transactionMaxSpans,
  setTransactionMaxSpans,
  isTransactionMaxSpansValid
}: Props) {
  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.settingsSection.title',
            { defaultMessage: 'Options' }
          )}
        </h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate(
          'xpack.apm.settings.agentConf.flyOut.settingsSection.sampleRateConfigurationInputLabel',
          { defaultMessage: 'Transaction sample rate' }
        )}
        helpText={i18n.translate(
          'xpack.apm.settings.agentConf.flyOut.settingsSection.sampleRateConfigurationInputHelpText',
          {
            defaultMessage:
              'Choose a rate between 0.000 and 1.0. Default is 1.0 (100% of traces).'
          }
        )}
        error={i18n.translate(
          'xpack.apm.settings.agentConf.flyOut.settingsSection.sampleRateConfigurationInputErrorText',
          { defaultMessage: 'Sample rate must be between 0.000 and 1' }
        )}
        isInvalid={!isEmpty(sampleRate) && !isSampleRateValid}
      >
        <EuiFieldText
          placeholder={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.settingsSection.sampleRateConfigurationInputPlaceholderText',
            { defaultMessage: 'Set sample rate' }
          )}
          value={sampleRate}
          onChange={e => {
            e.preventDefault();
            setSampleRate(e.target.value);
          }}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      {!isRumService && (
        <EuiFormRow
          label={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.settingsSection.captureBodyInputLabel',
            { defaultMessage: 'Capture body' }
          )}
          helpText={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.settingsSection.captureBodyInputHelpText',
            {
              defaultMessage:
                'For transactions that are HTTP requests, the agent can optionally capture the request body (e.g. POST variables). Default is "off".'
            }
          )}
        >
          <SelectWithPlaceholder
            placeholder={i18n.translate(
              'xpack.apm.settings.agentConf.flyOut.settingsSection.captureBodyInputPlaceholderText',
              { defaultMessage: 'Select option' }
            )}
            options={[
              { text: 'off' },
              { text: 'errors' },
              { text: 'transactions' },
              { text: 'all' }
            ]}
            value={captureBody}
            onChange={e => {
              e.preventDefault();
              setCaptureBody(e.target.value);
            }}
          />
        </EuiFormRow>
      )}

      {!isRumService && (
        <EuiFormRow
          label={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.settingsSection.transactionMaxSpansConfigInputLabel',
            { defaultMessage: 'Transaction max spans' }
          )}
          helpText={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.settingsSection.transactionMaxSpansConfigInputHelpText',
            {
              defaultMessage:
                'Limits the amount of spans that are recorded per transaction. Default is 500.'
            }
          )}
          error={i18n.translate(
            'xpack.apm.settings.agentConf.flyOut.settingsSection.transactionMaxSpansConfigInputErrorText',
            { defaultMessage: 'Must be between 0 and 32000' }
          )}
          isInvalid={
            !isEmpty(transactionMaxSpans) && !isTransactionMaxSpansValid
          }
        >
          <EuiFieldNumber
            placeholder={i18n.translate(
              'xpack.apm.settings.agentConf.flyOut.settingsSection.transactionMaxSpansConfigInputPlaceholderText',
              { defaultMessage: 'Set transaction max spans' }
            )}
            value={
              transactionMaxSpans === '' ? '' : Number(transactionMaxSpans)
            }
            min={0}
            max={32000}
            onChange={e => {
              e.preventDefault();
              setTransactionMaxSpans(e.target.value);
            }}
          />
        </EuiFormRow>
      )}
    </>
  );
}
