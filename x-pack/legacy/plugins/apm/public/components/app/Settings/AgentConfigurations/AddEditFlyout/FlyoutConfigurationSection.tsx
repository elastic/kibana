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
const t = (id: string, defaultMessage: string) =>
  i18n.translate(
    `xpack.apm.settings.agentConf.flyOut.ConfigurationSection.${id}`,
    { defaultMessage }
  );

interface ConfigOption {
  value: string;
  set: (value: string) => void;
  isValid?: boolean;
}

interface Props {
  sampleRate: ConfigOption;
  captureBody: ConfigOption;
  transactionMaxSpans: ConfigOption;
}

export function FlyoutConfigurationSection({
  sampleRate,
  captureBody,
  transactionMaxSpans
}: Props) {
  return (
    <>
      <EuiTitle size="xs">
        <h3>{t('title', 'Configuration')}</h3>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={t(
          'sampleRateConfigurationInputLabel',
          'Transaction sample rate'
        )}
        helpText={t(
          'sampleRateConfigurationInputHelpText',
          'Choose a rate between 0.000 and 1.0. Default is 1.0 (100% of traces).'
        )}
        error={t(
          'sampleRateConfigurationInputErrorText',
          'Sample rate must be between 0.000 and 1'
        )}
        isInvalid={!isEmpty(sampleRate.value) && !sampleRate.isValid}
      >
        <EuiFieldText
          placeholder={t(
            'sampleRateConfigurationInputPlaceholderText',
            'Set sample rate'
          )}
          value={sampleRate.value}
          onChange={e => {
            e.preventDefault();
            sampleRate.set(e.target.value);
          }}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={t('captureBodyInputLabel', 'Capture body')}
        helpText={t(
          'captureBodyInputHelpText',
          'For transactions that are HTTP requests, the agent can optionally capture the request body (e.g. POST variables). Default is "Off".'
        )}
      >
        <SelectWithPlaceholder
          placeholder={t('captureBodyInputPlaceholderText', 'Select option')}
          options={[
            {
              value: 'off',
              text: t('captureBodyConfigOptionOff', 'Off')
            },
            {
              value: 'errors',
              text: t('captureBodyConfigOptionErrors', 'Errors')
            },
            {
              value: 'transactions',
              text: t('captureBodyConfigOptionTransactions', 'Transactions')
            },
            {
              value: 'all',
              text: t('captureBodyConfigOptionAll', 'All')
            }
          ]}
          value={captureBody.value}
          onChange={e => {
            e.preventDefault();
            captureBody.set(e.target.value);
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        label={t(
          'transactionMaxSpansConfigInputLabel',
          'Transaction max spans'
        )}
        helpText={t(
          'transactionMaxSpansConfigInputHelpText',
          'Limits the amount of spans that are recorded per transaction. Default is 500.'
        )}
        error={t(
          'transactionMaxSpansConfigInputErrorText',
          'Must be between 0 and 32000'
        )}
        isInvalid={
          !isEmpty(transactionMaxSpans.value) && !transactionMaxSpans.isValid
        }
      >
        <EuiFieldNumber
          placeholder={t(
            'transactionMaxSpansConfigInputPlaceholderText',
            'Set transaction max spans'
          )}
          value={
            transactionMaxSpans.value === ''
              ? ''
              : Number(transactionMaxSpans.value)
          }
          min={0}
          max={32000}
          onChange={e => {
            e.preventDefault();
            transactionMaxSpans.set(e.target.value);
          }}
        />
      </EuiFormRow>
    </>
  );
}
