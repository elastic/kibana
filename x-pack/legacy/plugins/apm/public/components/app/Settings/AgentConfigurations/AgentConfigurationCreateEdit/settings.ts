/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isRight } from 'fp-ts/lib/Either';
import { i18n } from '@kbn/i18n';
import { transactionMaxSpansRt } from '../../../../../../../../../plugins/apm/common/runtime_types/transaction_max_spans_rt';
import { transactionSampleRateRt } from '../../../../../../../../../plugins/apm/common/runtime_types/transaction_sample_rate_rt';

interface BaseSetting {
  key: string;
  label: string;
  helpText: string;
  placeholder: string;
  // serialize: (value: unknown) => unknown;
  // deserialize: (value: unknown) => unknown;
}

interface TextSetting extends BaseSetting {
  type: 'text';
  validationError: string;
  isInvalid: (value: number) => boolean;
}

interface NumberSetting extends BaseSetting {
  type: 'number';
  min: number;
  max: number;
  validationError: string;
  isInvalid: (value: number) => boolean;
}

interface SelectSetting extends BaseSetting {
  type: 'select';
  options: Array<{ text: string }>;
}

export type Setting = TextSetting | NumberSetting | SelectSetting;

// const defaultSettings = {
//   TRANSACTION_SAMPLE_RATE: '1.0',
//   CAPTURE_BODY: 'off',
//   TRANSACTION_MAX_SPANS: '500'
// };

export const settings: Setting[] = [
  // Transaction sample rate
  {
    key: 'transaction_sample_rate',
    type: 'text',
    label: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.sampleRateConfigurationInputLabel',
      { defaultMessage: 'Transaction sample rate' }
    ),
    helpText: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.sampleRateConfigurationInputHelpText',
      {
        defaultMessage:
          'Choose a rate between 0.000 and 1.0. Default is 1.0 (100% of traces).'
      }
    ),
    placeholder: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.sampleRateConfigurationInputPlaceholderText',
      { defaultMessage: 'Set sample rate' }
    ),
    validationError: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.sampleRateConfigurationInputErrorText',
      { defaultMessage: 'Sample rate must be between 0.000 and 1' }
    ),
    isInvalid: (value: number) => isRight(transactionSampleRateRt.decode(value))
    // serialize: (value: number) => value,
    // deserialize: (value: number) => value
  },

  // Capture body
  {
    key: 'capture_body',
    type: 'select',
    label: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.captureBodyInputLabel',
      { defaultMessage: 'Capture body' }
    ),
    helpText: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.captureBodyInputHelpText',
      {
        defaultMessage:
          'For transactions that are HTTP requests, the agent can optionally capture the request body (e.g. POST variables). Default is "off".'
      }
    ),
    placeholder: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.captureBodyInputPlaceholderText',
      { defaultMessage: 'Select option' }
    ),
    options: [
      { text: 'off' },
      { text: 'errors' },
      { text: 'transactions' },
      { text: 'all' }
    ]
    // serialize: (value: number) => value,
    // deserialize: (value: number) => value
  },

  // Transaction max spans
  {
    key: 'transaction_max_spans',
    type: 'number',
    label: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.transactionMaxSpansConfigInputLabel',
      { defaultMessage: 'Transaction max spans' }
    ),
    helpText: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.transactionMaxSpansConfigInputHelpText',
      {
        defaultMessage:
          'Limits the amount of spans that are recorded per transaction. Default is 500.'
      }
    ),
    placeholder: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.transactionMaxSpansConfigInputPlaceholderText',
      { defaultMessage: 'Set transaction max spans' }
    ),
    validationError: i18n.translate(
      'xpack.apm.settings.agentConf.settingsSection.transactionMaxSpansConfigInputErrorText',
      { defaultMessage: 'Must be between 0 and 32000' }
    ),
    min: 0,
    max: 32000,
    isInvalid: (value: number) => isRight(transactionMaxSpansRt.decode(value))
    // serialize: (value: number) => value,
    // deserialize: (value: number) => value
  }
];
