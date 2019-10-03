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
  i18n.translate(`xpack.apm.settings.agentConf.flyOut.settingsSection.${id}`, {
    defaultMessage
  });

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
        <h3>{t('title', 'Settings')}</h3>
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
        isInvalid={!isEmpty(sampleRate) && !isSampleRateValid}
      >
        <EuiFieldText
          placeholder={t(
            'sampleRateConfigurationInputPlaceholderText',
            'Set sample rate'
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
            !isEmpty(transactionMaxSpans) && !isTransactionMaxSpansValid
          }
        >
          <EuiFieldNumber
            placeholder={t(
              'transactionMaxSpansConfigInputPlaceholderText',
              'Set transaction max spans'
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
